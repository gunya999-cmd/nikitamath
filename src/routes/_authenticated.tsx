import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sigma, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Загрузка…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <Sigma className="size-5 text-primary" /> Math Tutor
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/dashboard"><Button variant="ghost" size="sm">Главная</Button></Link>
            <Link to="/chat"><Button variant="ghost" size="sm">Чат с AI</Button></Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => supabase.auth.signOut()}
              title="Выйти"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}