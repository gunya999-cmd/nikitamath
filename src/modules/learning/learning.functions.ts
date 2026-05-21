/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SKILL_CATALOG, findSkillByCode, inferSkillTags } from "@/modules/learning/skill-tags";
import { classifyMistakeFromAnswer, getMistakeFeedback } from "@/modules/tutor/mistakes";

type SupabaseAny = any;

type SkillRow = { id: string; code: string; title: string };
type MasteryRow = {
  mastery_score?: number | string | null;
  confidence_score?: number | string | null;
  attempts_count?: number | null;
  skills?: { code?: string; title?: string } | null;
};

async function ensureSkillExists(db: SupabaseAny, code: string): Promise<SkillRow> {
  const { data, error } = await db.from("skills").select("id, code, title").eq("code", code).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Skill is not seeded: ${code}. Run the P1 migration.`);
  return data as SkillRow;
}

function getNextReviewDate(score: number) {
  const days = score >= 85 ? 14 : score >= 65 ? 7 : score >= 40 ? 3 : 1;
  return new Date(Date.now() + days * 86400000).toISOString();
}

export const getDailyLesson = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as SupabaseAny;

    const { data: profile } = await db
      .from("profiles")
      .select("name, school_grade, curriculum_type, xp, level, streak_days")
      .eq("id", userId)
      .maybeSingle();
    const { data: masteryRows } = await db
      .from("student_skill_mastery")
      .select("mastery_score, confidence_score, attempts_count, skills(code, title)")
      .eq("user_id", userId)
      .order("mastery_score", { ascending: true })
      .limit(8);

    const rows = (masteryRows ?? []) as MasteryRow[];
    const hasMastery = rows.length > 0;
    const weakSkills = rows
      .filter((row) => Number(row.mastery_score ?? 0) < 75)
      .slice(0, 3)
      .map((row) => ({
        code: row.skills?.code ?? "unknown",
        title: row.skills?.title ?? "Навык",
        masteryScore: Number(row.mastery_score ?? 0),
        confidenceScore: Number(row.confidence_score ?? 0),
      }));

    const fallbackSkill = SKILL_CATALOG.find((skill) => skill.code === "fractions") ?? SKILL_CATALOG[0];
    const focusSkill = weakSkills[0] ?? {
      code: fallbackSkill.code,
      title: fallbackSkill.title,
      masteryScore: hasMastery ? 60 : 0,
      confidenceScore: hasMastery ? 0.4 : 0,
    };

    const plan = hasMastery
      ? [
          { id: "warmup", title: "Разминка", description: "3 коротких задания, чтобы включиться без стресса.", minutes: 5 },
          { id: "focus", title: `Главная тема: ${focusSkill.title}`, description: "AI-репетитор ведёт вопросами и проверяет понимание после каждого шага.", minutes: 15 },
          { id: "review", title: "Повторение", description: "Закрепляем ошибку, которая чаще всего мешает двигаться дальше.", minutes: 7 },
          { id: "mini_check", title: "Мини-проверка", description: "Короткая проверка без давления, чтобы обновить mastery score.", minutes: 5 },
        ]
      : [
          { id: "diagnostic", title: "Начать диагностику уровня", description: "8 коротких заданий покажут сильные стороны и пробелы.", minutes: 12 },
          { id: "first_lesson", title: "Первый AI-урок", description: "После диагностики приложение построит персональный урок дня.", minutes: 15 },
        ];

    return {
      profile: profile ?? null,
      hasMastery,
      focusSkill,
      weakSkills,
      plan,
      recommendation: hasMastery
        ? `Сегодня лучше сфокусироваться на теме «${focusSkill.title}».`
        : "Сначала пройди короткую диагностику — она нужна, чтобы AI не учил вслепую.",
    };
  });

export const recordExerciseAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().min(1).max(4000),
        studentAnswer: z.string().min(1).max(2000),
        expectedAnswer: z.string().max(2000).optional().nullable(),
        skillCode: z.string().min(1).max(120).optional(),
        difficulty: z.number().int().min(1).max(5).default(2),
        threadId: z.string().uuid().optional().nullable(),
        sessionId: z.string().uuid().optional().nullable(),
        timeSpentSec: z.number().int().min(0).max(7200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as SupabaseAny;
    const inferredSkill = data.skillCode ? findSkillByCode(data.skillCode) : inferSkillTags(data.prompt)[0];
    const skill = await ensureSkillExists(db, inferredSkill?.code ?? SKILL_CATALOG[0].code);
    const mistakeType = classifyMistakeFromAnswer({
      prompt: data.prompt,
      studentAnswer: data.studentAnswer,
      expectedAnswer: data.expectedAnswer,
    });
    const isCorrect = mistakeType === "correct";

    const { data: attempt, error } = await db
      .from("exercise_attempts")
      .insert({
        user_id: userId,
        skill_id: skill.id,
        session_id: data.sessionId ?? null,
        thread_id: data.threadId ?? null,
        prompt: data.prompt,
        student_answer: data.studentAnswer,
        expected_answer: data.expectedAnswer ?? null,
        is_correct: isCorrect,
        mistake_type: mistakeType,
        difficulty: data.difficulty,
        ai_feedback: getMistakeFeedback(mistakeType),
        time_spent_sec: data.timeSpentSec ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { data: current } = await db
      .from("student_skill_mastery")
      .select("mastery_score, attempts_count, correct_attempts")
      .eq("user_id", userId)
      .eq("skill_id", skill.id)
      .maybeSingle();
    const attemptsCount = Number(current?.attempts_count ?? 0) + 1;
    const correctAttempts = Number(current?.correct_attempts ?? 0) + (isCorrect ? 1 : 0);
    const nextScore = Math.max(0, Math.min(100, Number(current?.mastery_score ?? 35) + (isCorrect ? 8 : -6)));

    await db.from("student_skill_mastery").upsert(
      {
        user_id: userId,
        skill_id: skill.id,
        mastery_score: nextScore,
        confidence_score: Math.min(1, attemptsCount / 8),
        attempts_count: attemptsCount,
        correct_attempts: correctAttempts,
        last_practiced_at: new Date().toISOString(),
        next_review_at: getNextReviewDate(nextScore),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,skill_id" },
    );

    return { attempt, skill, mistakeType, isCorrect, masteryScore: nextScore };
  });
