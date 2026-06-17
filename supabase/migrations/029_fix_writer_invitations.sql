-- 029_fix_writer_invitations.sql — fix ambiguous "id" in the extended
-- writer_invitations() from 028: the unqualified `select id into w_id` collides
-- with the OUT column `id` declared by `returns table(...)`. Qualify it.
drop function if exists public.writer_invitations();
create or replace function public.writer_invitations()
returns table (
  id uuid, ref text, client_code text, title text, program text, discipline text,
  level_label text, scope_label text, pages int, citation text, requirements text,
  notes text, due_date date, created_at timestamptz, priority text,
  rate_writing numeric, rate_project numeric
)
language plpgsql security definer set search_path = public as $$
declare v_writer uuid;
begin
  select w.id into v_writer from public.writers w where w.profile_id = auth.uid();
  if v_writer is null then return; end if;
  return query
    select o.id, o.ref, public.order_client_code(o.id), o.program, o.program, o.discipline,
           o.level_label, o.scope_label, o.pages, o.citation, o.requirements,
           o.notes, o.due_date, o.created_at, o.priority, o.rate_writing, o.rate_project
    from public.orders o
    where o.invited_writer_id = v_writer
      and o.invitation_status = 'pending'
      and o.writer_id is null
    order by o.created_at desc;
end; $$;
revoke all on function public.writer_invitations() from public;
grant execute on function public.writer_invitations() to authenticated;
