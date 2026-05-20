export type SkillTag = {
  code: string;
  title: string;
  gradeLevel: string;
  curriculumType: string;
  keywords: string[];
  prerequisiteCodes?: string[];
};

export const SKILL_CATALOG: SkillTag[] = [
  {
    code: "arithmetic_basic",
    title: "Базовая арифметика",
    gradeLevel: "3-7",
    curriculumType: "general",
    keywords: ["слож", "вычит", "умнож", "дел", "+", "-", "×", "*", ":", "/", "сумм"],
  },
  {
    code: "fractions",
    title: "Дроби",
    gradeLevel: "5-8",
    curriculumType: "general",
    keywords: ["дроб", "числител", "знаменател", "сократ", "общий знаменатель", "1/", "2/", "3/"],
    prerequisiteCodes: ["arithmetic_basic"],
  },
  {
    code: "negative_numbers",
    title: "Отрицательные числа",
    gradeLevel: "6-8",
    curriculumType: "general",
    keywords: ["отриц", "минус", "меньше нуля", "координат", "−"],
    prerequisiteCodes: ["arithmetic_basic"],
  },
  {
    code: "linear_equations",
    title: "Линейные уравнения",
    gradeLevel: "7-10",
    curriculumType: "general",
    keywords: ["уравнен", "x", "перенести", "раскрыть скобки", "линейн"],
    prerequisiteCodes: ["negative_numbers", "fractions"],
  },
  {
    code: "quadratic_equations",
    title: "Квадратные уравнения",
    gradeLevel: "8-11",
    curriculumType: "general",
    keywords: ["квадратн", "дискриминант", "парабол", "x^2", "корни"],
    prerequisiteCodes: ["linear_equations"],
  },
  {
    code: "geometry_basic",
    title: "Базовая геометрия",
    gradeLevel: "6-10",
    curriculumType: "general",
    keywords: ["угол", "треуголь", "градус", "площад", "периметр"],
  },
  {
    code: "word_problems",
    title: "Текстовые задачи",
    gradeLevel: "5-10",
    curriculumType: "general",
    keywords: ["задача", "скорость", "время", "расстояние", "процент", "условие", "сколько"],
  },
  {
    code: "functions_graphs",
    title: "Функции и графики",
    gradeLevel: "8-12",
    curriculumType: "general",
    keywords: ["функц", "график", "y=", "координат", "наклон", "значение функции"],
    prerequisiteCodes: ["linear_equations"],
  },
];

export function inferSkillTags(text: string, maxTags = 3) {
  const normalized = text.toLowerCase();
  const scored = SKILL_CATALOG.map((skill) => {
    const score = skill.keywords.reduce(
      (total, keyword) => (normalized.includes(keyword.toLowerCase()) ? total + 1 : total),
      0,
    );
    return { skill, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTags)
    .map((item) => item.skill);

  return scored.length > 0 ? scored : [SKILL_CATALOG[0]];
}

export function findSkillByCode(code: string) {
  return SKILL_CATALOG.find((skill) => skill.code === code) ?? null;
}
