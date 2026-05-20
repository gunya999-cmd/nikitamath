import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { getThreadMessages, updateThread } from "@/lib/threads.functions";
import { getMyProfile } from "@/lib/profile.functions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({ meta: [{ title: "Чат с AI — Math Tutor" }] }),
  component: ChatPage,
});

type Mode = "hint" | "teach" | "exam";

function ChatPage() {
  const { threadId } = useParams({ from: "/_authenticated/chat/$threadId" });
  return <ChatInner key={threadId} threadId={threadId} />;
}

function ChatInner({ threadId }: { threadId: string }) {
  const fetchMessages = useServerFn(getThreadMessages);
  const fetchProfile = useServerFn(getMyProfile);
  const updateT = useServerFn(updateThread);

  const { data, isLoading } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => fetchMessages({ data: { threadId } }),
  });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [mode, setMode] = useState<Mode>("teach");
  useEffect(() => {
    if (data?.thread.mode) setMode(data.thread.mode as Mode);
  }, [data?.thread.mode]);

  const initial = useMemo<UIMessage[]>(
    () => (data?.messages ?? []) as unknown as UIMessage[],
    [data?.messages],
  );

  return isLoading ? (
    <div className="p-10 text-center text-sm text-muted-foreground">Загрузка диалога…</div>
  ) : (
    <ChatWindow
      threadId={threadId}
      initialMessages={initial}
      mode={mode}
      setMode={(m) => {
        setMode(m);
        updateT({ data: { id: threadId, mode: m } });
      }}
      ctx={{
        name: profile?.name,
        schoolGrade: profile?.school_grade,
        curriculumType: profile?.curriculum_type,
        country: profile?.country,
      }}
    />
  );
}

function ChatWindow({
  threadId,
  initialMessages,
  mode,
  setMode,
  ctx,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  mode: Mode;
  setMode: (m: Mode) => void;
  ctx: Record<string, unknown>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          // attach extra body fields
          let body = init?.body;
          if (typeof body === "string") {
            try {
              const parsed = JSON.parse(body);
              parsed.threadId = threadId;
              parsed.mode = mode;
              parsed.ctx = ctx;
              body = JSON.stringify(parsed);
            } catch {}
          }
          return fetch(url, { ...init, headers, body });
        },
      }),
    [threadId, mode, ctx],
  );

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  const isLoading = status === "submitted" || status === "streaming";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-57px)] max-w-3xl flex-col px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Режим обучения:</div>
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {(["hint", "teach", "exam"] as const).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={mode === m ? "default" : "ghost"}
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => setMode(m)}
            >
              {m === "hint" ? "Подсказки" : m === "teach" ? "Обучение" : "Экзамен"}
            </Button>
          ))}
        </div>
      </div>

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-lg">Привет! 👋</p>
              <p className="mt-2 text-sm">Напиши задачу или тему — разберём вместе.</p>
            </div>
          )}
          {messages.map((m) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? (p as { text: string }).text : ""))
              .join("");
            return (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.role === "assistant" ? <MessageResponse>{text}</MessageResponse> : text}
                </MessageContent>
              </Message>
            );
          })}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Думаю…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <form onSubmit={onSubmit} className="mt-3">
        <PromptInput>
          <PromptInputTextarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напиши задачу или вопрос…"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={isLoading || !input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </form>
    </div>
  );
}