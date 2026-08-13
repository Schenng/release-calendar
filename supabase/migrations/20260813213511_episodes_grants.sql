-- Tables created through the CLI's login role miss the project's default
-- grants, so PostgREST roles need explicit privileges. Row access is still
-- enforced by the RLS policy; only signed-in users touch this table.

grant select, insert, update, delete on public.episodes to authenticated;
