import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  age: z.number().int().min(5).max(25).optional(),
  school_grade: z.string().min(1).max(40).optional(),
  country: z.string().min(1).max(80).optional(),
  curriculum_type: z.enum(["IB", "Bagrut", "Common Core", "Russian", "Other"]).optional(),
  onboarded: z.boolean().optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const addXp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ xp: z.number().int().min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("xp, level, streak_days, last_active_date")
      .eq("id", userId)
      .single();
    if (!prof) throw new Error("Profile missing");

    const newXp = (prof.xp ?? 0) + data.xp;
    const newLevel = Math.max(1, Math.floor(newXp / 100) + 1);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = prof.last_active_date === today ? prof.streak_days : prof.last_active_date === yesterday ? (prof.streak_days ?? 0) + 1 : 1;

    const { data: row, error } = await supabase
      .from("profiles")
      .update({ xp: newXp, level: newLevel, streak_days: streak, last_active_date: today })
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
