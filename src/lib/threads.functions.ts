import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<{ type: string; text?: string } & Record<string, unknown>>;
};

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("threads")
      .select("id, title, topic, mode, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().min(1).max(120).optional(),
        topic: z.string().min(1).max(120).optional(),
        mode: z.enum(["hint", "teach", "exam"]).default("teach"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("threads")
      .insert({
        user_id: userId,
        title: data.title ?? "Новый диалог",
        topic: data.topic ?? null,
        mode: data.mode,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("threads")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(120).optional(),
        mode: z.enum(["hint", "teach", "exam"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const { data: row, error } = await supabase
      .from("threads")
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getThreadMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: thread } = await supabase
      .from("threads")
      .select("id, title, mode, topic")
      .eq("id", data.threadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!thread) throw new Error("Thread not found");

    const { data: rows, error } = await supabase
      .from("messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const messages: StoredMessage[] = (rows ?? []).map((r) => ({
      id: r.id,
      role: r.role as StoredMessage["role"],
      parts: (r.parts as StoredMessage["parts"]) ?? [],
    }));
    return { thread, messages };
  });