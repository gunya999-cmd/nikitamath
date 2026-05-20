import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/profile.functions";
import { listThreads } from "@/lib/threads.functions";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, MessageSquarePlus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Дашборд — Math Tutor" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchProfile = useServerFn(getMyProfile);
  const fetchThreads = useServerFn(listThreads);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: threads } = useQuery({ queryKey: ["threads"], queryFn: () => fetchThreads() });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        Привет, {profile?.name ?? "ученик"} 👋
      </h1>
      <p className="mt-1 text-muted-foreground">Готов сегодня позаниматься?</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard icon={<Trophy className="size-5 text-primary" />} label="XP" value={profile?.xp ?? 0} />
        <StatCard icon={<Sparkles className="size-5 text-accent" />} label="Уровень" value={profile?.level ?? 1} />
        <StatCard icon={<Flame className="size-5 text-destructive" />} label="Серия дней" value={profile?.streak_days ?? 0} />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Твои диалоги</h2>
        <Link to="/chat">
          <Button><MessageSquarePlus className="size-4" /> Новый диалог</Button>
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {(threads ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Пока нет диалогов. Начни первый — попроси AI разобрать любую задачу.
          </div>
        )}
        {(threads ?? []).map((t) => (
          <Link
            key={t.id}
            to="/chat/$threadId"
            params={{ threadId: t.id }}
            className="block rounded-xl border border-border bg-card px-4 py-3 transition hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-muted-foreground">{t.mode}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon} {label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}