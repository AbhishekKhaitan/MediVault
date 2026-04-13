-- Migration 007: emergency_access_logs table
-- Records EVERY access to the emergency endpoint — no exceptions
create table emergency_access_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references family_members(id) on delete cascade,
  accessed_by_ip text not null,
  user_agent text,
  accessed_at timestamptz default now()
);

-- Row Level Security
alter table emergency_access_logs enable row level security;

-- Only family admins can view access logs for their members
create policy "Family admins can view emergency access logs"
  on emergency_access_logs for select
  using (
    member_id in (
      select id from family_members
      where family_id in (
        select family_id from family_members
        where user_id = auth.uid() and is_admin = true
      )
    )
  );

-- Inserts are done by the edge function via service role key (bypasses RLS)
-- No user-level insert policy needed

-- Index for admin dashboard queries
create index emergency_logs_member_accessed_idx
  on emergency_access_logs(member_id, accessed_at desc);
