import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/threads.functions";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: NewChat,
});

function NewChat() {
  const create = useServerFn(createThread);
  const nav = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    create({ data: { mode: "teach" } }).then((t) => {
      nav({ to: "/chat/$threadId", params: { threadId: t.id }, replace: true });
    });
  }, [create, nav]);

  return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Создаём диалог…</div>;
}