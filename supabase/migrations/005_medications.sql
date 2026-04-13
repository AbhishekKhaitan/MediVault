-- Migration 005: medications table
-- Stores active prescriptions extracted from parsed documents
create table medications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  member_id uuid references family_members(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  name text not null,
  dosage text not null,         -- e.g. '500mg'
  frequency text not null,      -- e.g. 'twice daily'
  duration text,                -- e.g. '5 days'
  is_active boolean default true,
  start_date date,
  end_date date,
  reminder_times text[] default '{}',  -- e.g. ['08:00', '20:00']
  created_at timestamptz default now()
);

-- Row Level Security
alter table medications enable row level security;

create policy "Family members can view medications"
  on medications for select
  using (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid()
    )
  );

create policy "Family members can insert medications"
  on medications for insert
  with check (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid()
    )
  );

create policy "Family members can update medications"
  on medications for update
  using (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid()
    )
  );

-- Index for emergency lookup (active meds only)
create index medications_member_active_idx
  on medications(member_id) where is_active = true;
