import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => undefined;

    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        setSession(s);
        setUser(s?.user ?? null);
      });
      unsubscribe = () => sub.subscription.unsubscribe();

      supabase.auth
        .getSession()
        .then(({ data }) => {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setLoading(false);
        })
        .catch(() => {
          setSession(null);
          setUser(null);
          setLoading(false);
        });
    } catch {
      setSession(null);
      setUser(null);
      setLoading(false);
    }

    return unsubscribe;
  }, []);

  return { session, user, loading };
}
