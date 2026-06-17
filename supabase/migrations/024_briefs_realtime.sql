-- 024_briefs_realtime.sql
-- New briefs now stream into the admin "Incoming briefs" page live. Previously the
-- briefs list only loaded on mount (orders had realtime, briefs did not), so a
-- freshly-submitted brief looked like it "didn't register" until a manual refresh.
-- Idempotent: skip if briefs is already a member of the publication.
do $$
begin
  alter publication supabase_realtime add table public.briefs;
exception
  when duplicate_object then null;   -- already in the publication
end $$;

alter table public.briefs replica identity full;
