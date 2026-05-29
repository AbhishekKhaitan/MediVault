-- Migration 009: Fix infinite-recursion in RLS policies
--
-- PROBLEM: every table's policy subqueried `family_members`, and the
-- family_members SELECT policy queried family_members itself. Postgres
-- raises "infinite recursion detected in policy for relation
-- family_members" (error 42P17) on every read, which made registration
-- (and everything else) fail.
--
-- FIX: a SECURITY DEFINER helper function returns the caller's family_ids
-- while bypassing RLS, so no policy needs to read family_members directly.

-- ── Helper: family_ids the current user belongs to (bypasses RLS) ──────────
create or replace function public.user_family_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select family_id
  from public.family_members
  where user_id = auth.uid()
$$;

grant execute on function public.user_family_ids() to authenticated, anon;

-- ── families ───────────────────────────────────────────────────────────────
drop policy if exists "Members can view their family" on families;
create policy "Members can view their family"
  on families for select
  using (
    -- creator can always read their own family (needed during registration,
    -- before any family_members row exists yet)
    created_by = auth.uid()
    or id in (select user_family_ids())
  );

-- ── family_members ───────────────────────────────────────────────────────
drop policy if exists "Family members can view members in their family" on family_members;
create policy "Family members can view members in their family"
  on family_members for select
  using (
    user_id = auth.uid()                         -- always see your own row
    or family_id in (select user_family_ids())   -- and the rest of your family
  );

drop policy if exists "Admins can insert family members" on family_members;
create policy "Admins can insert family members"
  on family_members for insert
  with check (
    user_id = auth.uid()                         -- self-insert on registration
    or family_id in (select user_family_ids())   -- add others to your family
  );

drop policy if exists "Admins can update family members" on family_members;
create policy "Admins can update family members"
  on family_members for update
  using (
    user_id = auth.uid()
    or family_id in (select user_family_ids())
  );

-- ── documents ──────────────────────────────────────────────────────────────
drop policy if exists "Family members can view their documents" on documents;
create policy "Family members can view their documents"
  on documents for select
  using (family_id in (select user_family_ids()));

drop policy if exists "Family members can insert documents" on documents;
create policy "Family members can insert documents"
  on documents for insert
  with check (family_id in (select user_family_ids()));

drop policy if exists "Family members can update documents" on documents;
create policy "Family members can update documents"
  on documents for update
  using (family_id in (select user_family_ids()));

-- ── health_metrics ───────────────────────────────────────────────────────
drop policy if exists "Family members can view their health metrics" on health_metrics;
create policy "Family members can view their health metrics"
  on health_metrics for select
  using (family_id in (select user_family_ids()));

drop policy if exists "Service role can insert health metrics" on health_metrics;
create policy "Service role can insert health metrics"
  on health_metrics for insert
  with check (family_id in (select user_family_ids()));

-- ── medications ────────────────────────────────────────────────────────────
drop policy if exists "Family members can view medications" on medications;
create policy "Family members can view medications"
  on medications for select
  using (family_id in (select user_family_ids()));

drop policy if exists "Family members can insert medications" on medications;
create policy "Family members can insert medications"
  on medications for insert
  with check (family_id in (select user_family_ids()));

drop policy if exists "Family members can update medications" on medications;
create policy "Family members can update medications"
  on medications for update
  using (family_id in (select user_family_ids()));

-- ── medication_logs ──────────────────────────────────────────────────────
drop policy if exists "Family members can view medication logs" on medication_logs;
create policy "Family members can view medication logs"
  on medication_logs for select
  using (
    member_id in (
      select id from family_members
      where family_id in (select user_family_ids())
    )
  );

drop policy if exists "Family members can insert medication logs" on medication_logs;
create policy "Family members can insert medication logs"
  on medication_logs for insert
  with check (
    member_id in (
      select id from family_members
      where family_id in (select user_family_ids())
    )
  );
