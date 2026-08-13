import { useCallback, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface Episode {
  id: string;
  name: string;
  /** ISO date ("YYYY-MM-DD") of the assigned release slot, or null if unassigned. */
  release_date: string | null;
}

export function useEpisodes(session: Session | null) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = session?.user.id ?? null;

  const load = useCallback(async () => {
    if (!userId) {
      setEpisodes([]);
      setError(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("episodes")
      .select("id,name,release_date")
      .order("created_at");
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setEpisodes(data ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (op: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await op;
    if (error) {
      setError(error.message);
      return false;
    }
    await load();
    return true;
  };

  const create = (name: string, releaseDate: string | null) =>
    run(
      supabase.from("episodes").insert({
        user_id: userId,
        name,
        release_date: releaseDate,
      }),
    );

  const update = (id: string, fields: { name?: string; release_date?: string | null }) =>
    run(supabase.from("episodes").update(fields).eq("id", id));

  const remove = (id: string) => run(supabase.from("episodes").delete().eq("id", id));

  return { episodes, loading, error, create, update, remove };
}
