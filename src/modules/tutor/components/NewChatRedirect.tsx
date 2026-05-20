import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/modules/tutor/server/threads.functions";

export function NewChatRedirect() {
  const create = useServerFn(createThread);
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    create({ data: { mode: "teach" } }).then((thread) => {
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id }, replace: true });
    });
  }, [create, navigate]);

  return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Создаём урок…</div>;
}
