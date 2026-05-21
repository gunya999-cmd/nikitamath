/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getDiagnosticQuestionsForProfile, INITIAL_DIAGNOSTIC_QUESTIONS } from "@/modules/diagnostics/question-bank";
import { classifyMistakeFromAnswer, getMistakeFeedback, isAnswerCorrect } from "@/modules/tutor/mistakes";
import { findSkillByCode } from "@/modules/learning/skill-tags";

type Db = any;
type SkillRow = { id: string; code: string; title: string };

async function getSkill(db: Db, code: string): Promise<SkillRow> {
  const { data, error } = await db.from("skills").select("id, code, title").eq("code", code).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Missing skill: ${code}`);
  return data as SkillRow;
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
    for (const item of data.answers) {
      const question = INITIAL_DIAGNOSTIC_QUESTIONS.find((q) => q.id === item.questionId);
      if (!question) continue;
      const skill = await getSkill(db, question.skillCode);
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
      await db.from("student_skill_mastery").upsert(
        {
          user_id: userId,
          skill_id: skill.id,
          mastery_score: masteryScore,
          confidence_score: 0.35,
          attempts_count: 1,
          correct_attempts: correct ? 1 : 0,
          last_practiced_at: new Date().toISOString(),
          next_review_at: nextReview(masteryScore),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,skill_id" },
      );

      results.push({ questionId: question.id, skillCode: question.skillCode, skillTitle: skill.title, correct, mistakeType, masteryScore });
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
