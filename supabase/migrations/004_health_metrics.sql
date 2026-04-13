-- Migration 004: health_metrics table
-- Stores individual test results for trend charting
create table health_metrics (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  member_id uuid references family_members(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  metric_name text not null,    -- e.g. 'HbA1c', 'Haemoglobin'
  value numeric not null,
  unit text not null,           -- e.g. 'g/dL', '%'
  reference_min numeric,
  reference_max numeric,
  is_flagged boolean default false,
  recorded_at date not null,    -- date of the source document
  created_at timestamptz default now()
);

-- Row Level Security
alter table health_metrics enable row level security;

create policy "Family members can view their health metrics"
  on health_metrics for select
  using (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid()
    )
  );

create policy "Service role can insert health metrics"
  on health_metrics for insert
  with check (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid()
    )
  );

-- Index for trend chart queries
create index health_metrics_member_metric_idx
  on health_metrics(member_id, metric_name, recorded_at);
