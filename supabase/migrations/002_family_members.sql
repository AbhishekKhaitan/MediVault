-- Migration 002: family_members table
create table family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id),  -- null if not on app yet
  name text not null,
  date_of_birth date,
  blood_group text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  known_allergies text[],
  phone text,  -- used for emergency lookup
  relation text,  -- 'father','mother','self', etc.
  is_admin boolean default false,
  emergency_access_enabled boolean default true,
  avatar_url text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table family_members enable row level security;

create policy "Family members can view members in their family"
  on family_members for select
  using (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid()
    )
  );

create policy "Admins can insert family members"
  on family_members for insert
  with check (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid() and is_admin = true
    )
    or user_id = auth.uid()  -- allow self-insert on registration
  );

create policy "Admins can update family members"
  on family_members for update
  using (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid() and is_admin = true
    )
  );

-- Index for emergency lookup by phone
create index family_members_phone_idx on family_members(phone)
  where emergency_access_enabled = true;
