import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { startDiagnostic, submitDiagnostic } from "@/modules/diagnostics/server/diagnostics.functions";

type Answer = { questionId: string; answer: string };
type DiagnosticResult = { score: number; correctCount: number; total: number; recommendedPath: { code: string; title: string }[] };

export function DiagnosticFlow() {
  const start = useServerFn(startDiagnostic);
  const submit = useServerFn(submitDiagnostic);
  const { data, isLoading } = useQuery({ queryKey: ["diagnostic-start"], queryFn: () => start() });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const questions = data?.questions ?? [];
  const progress = useMemo(() => questions.filter((q) => answers[q.id]?.trim()).length, [answers, questions]);

  async function onSubmit() {
    if (!data?.session?.id) return;
    setSubmitting(true);
    try {
      const payload: Answer[] = questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? "" })).filter((item) => item.answer.trim());
      const res = await submit({ data: { sessionId: data.session.id, answers: payload } });
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <main className="mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground">Готовим диагностику…</main>;

  if (result) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <section className="rounded-[2rem] border border-border bg-card p-7 shadow-sm">
          <p className="text-sm font-medium text-primary">Диагностика завершена</p>
          <h1 className="mt-3 text-3xl font-semibold">Результат: {result.score}%</h1>
          <p className="mt-2 text-muted-foreground">Правильных ответов: {result.correctCount} из {result.total}.</p>
          <div className="mt-6 grid gap-3">
            {result.recommendedPath.map((skill) => (
              <div key={skill.code} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="font-medium">{skill.title}</div>
                <div className="text-sm text-muted-foreground">Рекомендуемая тема для ближайших уроков</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Link to="/dashboard"><Button className="rounded-full">К уроку дня</Button></Link>
            <Link to="/chat"><Button variant="outline" className="rounded-full">Открыть AI-репетитора</Button></Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <section className="rounded-[2rem] border border-border bg-card p-7 shadow-sm">
        <p className="text-sm font-medium text-primary">Диагностика уровня</p>
        <h1 className="mt-3 text-3xl font-semibold">8 коротких задач</h1>
        <p className="mt-2 text-muted-foreground">Это не экзамен. Ответы нужны, чтобы AI-репетитор видел пробелы и не учил вслепую.</p>
        <p className="mt-4 text-sm text-muted-foreground">Заполнено: {progress} из {questions.length}</p>
      </section>

      <section className="mt-6 space-y-4">
        {questions.map((question, index) => (
          <div key={question.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Задача {index + 1} · {question.skillTitle}</p>
                <h2 className="mt-2 text-lg font-medium">{question.prompt}</h2>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">ур. {question.difficulty}</span>
            </div>
            <input
              className="mt-4 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              value={answers[question.id] ?? ""}
              onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
              placeholder="Твой ответ"
            />
          </div>
        ))}
      </section>

      <div className="mt-6 flex justify-end">
        <Button className="rounded-full" onClick={onSubmit} disabled={submitting || progress === 0}>{submitting ? "Проверяем…" : "Завершить диагностику"}</Button>
      </div>
    </main>
  );
}
