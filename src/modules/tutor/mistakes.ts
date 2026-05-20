export type MistakeType =
  | "correct"
  | "calculation_error"
  | "concept_gap"
  | "sign_error"
  | "fraction_error"
  | "equation_balance_error"
  | "reading_comprehension"
  | "incomplete_solution"
  | "unknown";

export function normalizeMathAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[−–—]/g, "-");
}

export function isAnswerCorrect(studentAnswer: string, expectedAnswer: string) {
  return normalizeMathAnswer(studentAnswer) === normalizeMathAnswer(expectedAnswer);
}

export function classifyMistakeFromAnswer(input: {
  prompt: string;
  studentAnswer: string;
  expectedAnswer?: string | null;
}): MistakeType {
  const prompt = input.prompt.toLowerCase();
  const answer = input.studentAnswer.trim().toLowerCase();
  const expected = input.expectedAnswer?.trim();

  if (expected && isAnswerCorrect(answer, expected)) return "correct";
  if (!answer || answer.length < 2) return "incomplete_solution";
  if (prompt.includes("услов") || prompt.includes("сколько") || prompt.includes("процент")) return "reading_comprehension";
  if (prompt.includes("дроб") || prompt.includes("знаменател") || prompt.includes("/") || prompt.includes("общий знаменатель")) return "fraction_error";
  if (answer.includes("--") || answer.includes("+-") || answer.includes("-+")) return "sign_error";
  if (prompt.includes("уравнен") || prompt.includes("x") || prompt.includes("скоб")) return "equation_balance_error";
  if (/\d/.test(answer) && expected) return "calculation_error";
  return "concept_gap";
}

export function getMistakeFeedback(type: MistakeType) {
  const feedback: Record<MistakeType, string> = {
    correct: "Correct answer. Give one similar task to consolidate the skill.",
    calculation_error: "Likely calculation error. Check arithmetic step by step.",
    concept_gap: "Likely concept gap. Explain the idea more simply.",
    sign_error: "Likely sign error. Check negative numbers and moved terms.",
    fraction_error: "Likely fraction gap. Check denominators, simplification, and fraction operations.",
    equation_balance_error: "Likely equation balance error. Check both sides and transformations.",
    reading_comprehension: "Likely word-problem reading/modeling issue. Re-read the condition.",
    incomplete_solution: "Answer is incomplete. Ask the student to finish the reasoning or final result.",
    unknown: "Mistake type is not clear yet.",
  };

  return feedback[type];
}
