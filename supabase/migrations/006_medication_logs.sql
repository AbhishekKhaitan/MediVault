-- Migration 006: medication_logs table
-- Stores daily tick/cross records for medication reminders
create table medication_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references medications(id) on delete cascade,
  member_id uuid references family_members(id) on delete cascade,
  taken boolean not null,
  taken_at timestamptz,
  scheduled_time text not null,   -- e.g. '08:00'
  log_date date not null default current_date,
  created_at timestamptz default now()
);

-- Row Level Security
alter table medication_logs enable row level security;

create policy "Family members can view medication logs"
  on medication_logs for select
  using (
    member_id in (
      select id from family_members
      where family_id in (
        select family_id from family_members
        where user_id = auth.uid()
      )
    )
  );

create policy "Family members can insert medication logs"
  on medication_logs for insert
  with check (
    member_id in (
      select id from family_members
      where family_id in (
        select family_id from family_members
        where user_id = auth.uid()
      )
    )
  );

-- Index for today's compliance view
create index medication_logs_date_idx
  on medication_logs(member_id, log_date desc);
