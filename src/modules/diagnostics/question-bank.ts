import { SKILL_CATALOG } from "@/modules/learning/skill-tags";

export type DiagnosticQuestion = {
  id: string;
  skillCode: string;
  prompt: string;
  answer: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
};

export const INITIAL_DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  { id: "diag-arithmetic-1", skillCode: "arithmetic_basic", prompt: "Вычисли: 48 + 27 - 19", answer: "56", difficulty: 1 },
  { id: "diag-fractions-1", skillCode: "fractions", prompt: "Сократи дробь 18/24.", answer: "3/4", difficulty: 2 },
  { id: "diag-negative-1", skillCode: "negative_numbers", prompt: "Вычисли: -7 + 12 - 9", answer: "-4", difficulty: 2 },
  { id: "diag-linear-1", skillCode: "linear_equations", prompt: "Реши уравнение: 3x + 5 = 20.", answer: "5", difficulty: 3 },
  { id: "diag-quadratic-1", skillCode: "quadratic_equations", prompt: "Найди корни уравнения: x^2 - 5x + 6 = 0.", answer: "2.3", difficulty: 4 },
  { id: "diag-geometry-1", skillCode: "geometry_basic", prompt: "В треугольнике два угла равны 40° и 65°. Найди третий угол.", answer: "75", difficulty: 2 },
  { id: "diag-word-1", skillCode: "word_problems", prompt: "У Маши было 120 шекелей. Она потратила 25%. Сколько шекелей она потратила?", answer: "30", difficulty: 3 },
  { id: "diag-functions-1", skillCode: "functions_graphs", prompt: "Для функции y = 2x + 1 найди y при x = 4.", answer: "9", difficulty: 2 },
];

export function getDiagnosticQuestionsForProfile(profile?: { school_grade?: string | null; curriculum_type?: string | null }) {
  return INITIAL_DIAGNOSTIC_QUESTIONS.map((question) => {
    const skill = SKILL_CATALOG.find((item) => item.code === question.skillCode);
    return {
      ...question,
      skillTitle: skill?.title ?? question.skillCode,
      gradeLevel: skill?.gradeLevel ?? null,
      curriculumType: profile?.curriculum_type ?? "general",
    };
  });
}
