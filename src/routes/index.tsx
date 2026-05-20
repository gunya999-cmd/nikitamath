import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Sigma, Sparkles, Brain, Target } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Sigma className="size-6 text-primary" />
          Math Tutor
        </div>
        <Link to="/login">
          <Button variant="ghost">Войти</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3 text-accent" />
          Персональный AI-учитель
        </div>
        <h1 className="text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
          Не решает за тебя.<br />
          <span className="text-primary">Учит понимать.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          AI-репетитор по математике, который адаптируется под твой класс, программу и темп. Ведёт вопросами, а не готовыми ответами.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link to="/login">
            <Button size="lg">Начать бесплатно</Button>
          </Link>
        </div>

        <div className="mt-20 grid gap-6 text-left md:grid-cols-3">
          {[
            { icon: Brain, t: "3 режима", d: "Подсказки, Обучение, Экзамен — для разных задач." },
            { icon: Target, t: "Адаптивно", d: "Замечает слабые темы и возвращается к ним." },
            { icon: Sparkles, t: "Уважительно", d: "Тёплый тон, без 'это же легко'." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-card p-6">
              <f.icon className="mb-3 size-5 text-primary" />
              <div className="font-medium">{f.t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
