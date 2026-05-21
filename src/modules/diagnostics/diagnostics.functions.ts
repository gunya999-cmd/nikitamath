/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getDiagnosticQuestionsForProfile, INITIAL_DIAGNOSTIC_QUESTIONS } from "@/modules/diagnostics/question-bank";
import { classifyMistakeFromAnswer, getMistakeFeedback, isAnswerCorrect } from "@/modules/tutor/mistakes";
import { findSkillByCode } from "@/modules/learning/skill-tags";

type Db = any;
type SkillRow = { id: string; code: string; title: string };
type MasteryState = { attemptsCount: number; correctAttempts: number; masteryScore: number };

async function getSkillsByCodes(db: Db, codes: string[]): Promise<Map<string, SkillRow>> {
  if (codes.length === 0) return new Map();
  const { data, error } = await db.from("skills").select("id, code, title").in("code", codes);
  if (error) throw new Error(error.message);
  const skills = (data ?? []) as SkillRow[];
  return new Map(skills.map((skill) => [skill.code, skill]));
}

function nextReview(score: number) {
  const days = score >= 80 ? 10 : score >= 60 ? 5 : 2;
  return new Date(Date.now() + days * 86400000).toISOString();
}

export const startDiagnostic = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as Db;
    const { data: profile } = await db
      .from("profiles")
      .select("school_grade, curriculum_type")
      .eq("id", userId)
      .maybeSingle();
    const questions = getDiagnosticQuestionsForProfile(profile ?? undefined).map(({ answer, ...safeQuestion }) => safeQuestion);
    const { data: session, error } = await db
      .from("learning_sessions")
      .insert({ user_id: userId, mode: "diagnostic", metadata: { count: questions.length } })
      .select("id, started_at")
      .single();
    if (error) throw new Error(error.message);
    return { session, questions, total: questions.length };
  });

const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1).max(2000),
  timeSpentSec: z.number().int().min(0).max(3600).optional(),
});

export const submitDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().uuid(), answers: z.array(answerSchema).min(1).max(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as Db;
    const { data: session } = await db
      .from("learning_sessions")
      .select("id")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!session) throw new Error("Diagnostic session not found");

    const results = [];
    const questionById = new Map(INITIAL_DIAGNOSTIC_QUESTIONS.map((question) => [question.id, question]));
    const answeredQuestions = data.answers
      .map((item) => questionById.get(item.questionId))
      .filter((question): question is (typeof INITIAL_DIAGNOSTIC_QUESTIONS)[number] => Boolean(question));
    const uniqueSkillCodes = Array.from(new Set(answeredQuestions.map((q) => q.skillCode)));
    const skillsByCode = await getSkillsByCodes(db, uniqueSkillCodes);
    const skillIds = Array.from(skillsByCode.values()).map((skill) => skill.id);
    const { data: masteryRows } =
      skillIds.length > 0
        ? await db
            .from("student_skill_mastery")
            .select("skill_id, attempts_count, correct_attempts")
            .eq("user_id", userId)
            .in("skill_id", skillIds)
        : { data: [] };
    const masteryBySkillId = new Map(
      (masteryRows ?? []).map((row: { skill_id: string; attempts_count: number | null; correct_attempts: number | null }) => [
        row.skill_id,
        {
          attemptsCount: row.attempts_count ?? 0,
          correctAttempts: row.correct_attempts ?? 0,
        },
      ]),
    );
    const masteryUpdatesBySkillId = new Map<string, MasteryState>();
    for (const item of data.answers) {
      const question = questionById.get(item.questionId);
      if (!question) continue;
      const skill = skillsByCode.get(question.skillCode);
      if (!skill) continue;
      const correct = isAnswerCorrect(item.answer, question.answer);
      const mistakeType = classifyMistakeFromAnswer({
        prompt: question.prompt,
        studentAnswer: item.answer,
        expectedAnswer: question.answer,
      });

      await db.from("exercise_attempts").insert({
        user_id: userId,
        skill_id: skill.id,
        session_id: data.sessionId,
        prompt: question.prompt,
        student_answer: item.answer,
        expected_answer: question.answer,
        is_correct: correct,
        mistake_type: mistakeType,
        difficulty: question.difficulty,
        ai_feedback: getMistakeFeedback(mistakeType),
        time_spent_sec: item.timeSpentSec ?? null,
      });

      const masteryScore = correct ? Math.min(100, 55 + question.difficulty * 8) : Math.max(10, 45 - question.difficulty * 5);
      const skillMastery = masteryBySkillId.get(skill.id) ?? { attemptsCount: 0, correctAttempts: 0 };
      const attemptsCount = skillMastery.attemptsCount + 1;
      const correctAttempts = skillMastery.correctAttempts + (correct ? 1 : 0);
      masteryBySkillId.set(skill.id, { attemptsCount, correctAttempts });
      masteryUpdatesBySkillId.set(skill.id, { attemptsCount, correctAttempts, masteryScore });

      results.push({ questionId: question.id, skillCode: question.skillCode, skillTitle: skill.title, correct, mistakeType, masteryScore });
    }

    for (const [skillId, update] of masteryUpdatesBySkillId.entries()) {
      await db.from("student_skill_mastery").upsert(
        {
          user_id: userId,
          skill_id: skillId,
          mastery_score: update.masteryScore,
          confidence_score: 0.35,
          attempts_count: update.attemptsCount,
          correct_attempts: update.correctAttempts,
          last_practiced_at: new Date().toISOString(),
          next_review_at: nextReview(update.masteryScore),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,skill_id" },
      );
    }

    const correctCount = results.filter((r) => r.correct).length;
    const score = results.length ? Math.round((correctCount / results.length) * 100) : 0;
    const weakSkillCodes = results.filter((r) => !r.correct).map((r) => r.skillCode);
    const strongSkillCodes = results.filter((r) => r.correct).map((r) => r.skillCode);
    const recommendedPath = (weakSkillCodes.length ? weakSkillCodes : ["linear_equations"])
      .slice(0, 4)
      .map((code) => ({ code, title: findSkillByCode(code)?.title ?? code }));

    await db
      .from("learning_sessions")
      .update({
        ended_at: new Date().toISOString(),
        total_xp: correctCount * 10,
        summary: `Diagnostic score: ${score}%`,
        metadata: { results },
      })
      .eq("id", data.sessionId)
      .eq("user_id", userId);

    const { data: diagnosticResult, error } = await db
      .from("diagnostic_results")
      .insert({
        user_id: userId,
        session_id: data.sessionId,
        weak_skill_codes: weakSkillCodes,
        strong_skill_codes: strongSkillCodes,
        recommended_path: recommendedPath,
        score,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return { score, correctCount, total: results.length, weakSkillCodes, strongSkillCodes, recommendedPath, results, diagnosticResult };
  });
