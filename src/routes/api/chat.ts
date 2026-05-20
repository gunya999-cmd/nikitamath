import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { buildTutorSystemPrompt, type TutorMode, type TutorContext } from "@/lib/tutor-prompt";
import { createClient } from "@supabase/supabase-js";

type ChatBody = {
  messages: UIMessage[];
  threadId?: string;
  mode?: TutorMode;
  ctx?: TutorContext;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as ChatBody;
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice(7);

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          },
        );
        const { data: claims } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const mode: TutorMode = body.mode ?? "teach";
        const ctx: TutorContext = body.ctx ?? {};
        const system = buildTutorSystemPrompt(mode, ctx);

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
          onFinish: async ({ messages }) => {
            if (!body.threadId) return;
            try {
              // Persist only the new messages (user's latest + assistant reply)
              const last = messages.slice(-2);
              const rows = last.map((m) => ({
                thread_id: body.threadId!,
                user_id: userId,
                role: m.role,
                parts: m.parts as unknown,
              }));
              await supabase.from("messages").insert(rows);
              await supabase
                .from("threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", body.threadId)
                .eq("user_id", userId);
            } catch (e) {
              console.error("persist messages failed", e);
            }
          },
        });
      },
    },
  },
});