import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getDailyLesson } from "@/modules/learning/server/learning.functions";

export function DailyLessonDashboard() {
  const fetchDailyLesson = useServerFn(getDailyLesson);
  const { data, isLoading } = useQuery({ queryKey: ["daily-lesson"], queryFn: () => fetchDailyLesson() });

  if (isLoading) return <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-muted-foreground">Готовим урок дня…</main>;

  const profile = data?.profile;
  const plan = data?.plan ?? [];
  const weakSkills = data?.weakSkills ?? [];
  const focusSkill = data?.focusSkill;
  const target = data?.hasMastery ? "/chat" : "/diagnostic";

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <section className="rounded-[2rem] border border-border bg-card p-7 shadow-sm">
        <p className="text-sm font-medium text-primary">Урок дня</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Привет, {profile?.name ?? "ученик"}</h1>
        <p className="mt-2 text-muted-foreground">{data?.recommendation}</p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>XP: {profile?.xp ?? 0}</span>
          <span>Уровень: {profile?.level ?? 1}</span>
          <span>Серия: {profile?.streak_days ?? 0}</span>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Фокус сегодня</p>
            <h2 className="mt-1 text-2xl font-semibold">{focusSkill?.title ?? "Диагностика уровня"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Mastery: {Math.round(focusSkill?.masteryScore ?? 0)}%</p>
          </div>
          <Link to={target}><Button className="rounded-full">{data?.hasMastery ? "Начать урок" : "Пройти диагностику"}</Button></Link>
        </div>
        <div className="mt-6 grid gap-3">
          {plan.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex justify-between gap-3"><h3 className="font-medium">{index + 1}. {item.title}</h3><span className="text-xs text-muted-foreground">{item.minutes} мин</span></div>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Слабые темы</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {weakSkills.length === 0 ? <p className="text-sm text-muted-foreground">Пока нет карты знаний. Начни с диагностики.</p> : weakSkills.map((skill) => (
            <div key={skill.code} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="font-medium">{skill.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{Math.round(skill.masteryScore)}%</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
