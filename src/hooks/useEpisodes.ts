import { useCallback, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { compare, fromISO, fromLocalDate } from "../lib/schedule";

export interface Episode {
  id: string;
  name: string;
  /** ISO date ("YYYY-MM-DD") of the assigned release slot, or null if unassigned. */
  release_date: string | null;
  /** ISO filming date ("YYYY-MM-DD"), which may be in the past or future. */
  filmed_date: string | null;
}

export function useEpisodes(session: Session | null) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = session?.user.id ?? null;
  const today = fromLocalDate(new Date());

  const hasBeenFilmed = (filmedDate: string | null | undefined) =>
    Boolean(filmedDate && compare(fromISO(filmedDate), today) <= 0);

  const load = useCallback(async () => {
    if (!userId) {
      setEpisodes([]);
      setError(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("episodes")
      .select("id,name,release_date,filmed_date")
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

  const create = (name: string, releaseDate: string | null, filmedDate: string | null) => {
    if (releaseDate !== null && !hasBeenFilmed(filmedDate)) {
      setError("Film the episode before assigning a release date.");
      return Promise.resolve(false);
    }
    return run(
      supabase.from("episodes").insert({
        user_id: userId,
        name,
        release_date: releaseDate,
        filmed_date: filmedDate,
      }),
    );
  };

  const update = async (
    id: string,
    fields: { name?: string; release_date?: string | null; filmed_date?: string | null },
  ) => {
    const current = episodes.find((episode) => episode.id === id);
    const releaseDate = fields.release_date === undefined ? current?.release_date : fields.release_date;
    const filmedDate = fields.filmed_date === undefined ? current?.filmed_date : fields.filmed_date;
    if (releaseDate !== null && releaseDate !== undefined && !hasBeenFilmed(filmedDate)) {
      setError("Film the episode before assigning a release date.");
      return false;
    }
    return run(supabase.from("episodes").update(fields).eq("id", id));
  };

  const remove = (id: string) => run(supabase.from("episodes").delete().eq("id", id));

  return { episodes, loading, error, create, update, remove };
}
