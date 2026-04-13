-- Migration 001: families table
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  subscription_status text default 'free'
    check (subscription_status in ('free', 'active', 'cancelled')),
  subscription_end_date timestamptz,
  razorpay_subscription_id text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table families enable row level security;

-- Policy: user can access families they belong to (checked via family_members)
create policy "Members can view their family"
  on families for select
  using (
    id in (
      select family_id from family_members
      where user_id = auth.uid()
    )
  );

create policy "Family creator can update"
  on families for update
  using (created_by = auth.uid());

create policy "Authenticated users can create a family"
  on families for insert
  with check (created_by = auth.uid());
