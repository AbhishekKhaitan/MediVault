-- Migration 003: documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  member_id uuid references family_members(id) on delete cascade,
  document_type text not null
    check (document_type in ('lab_report','prescription','discharge_summary','xray','other')),
  title text,
  doctor_name text,
  hospital_name text,
  document_date date,
  storage_path text not null,  -- path in supabase storage
  ocr_raw_text text,
  ai_parsed jsonb,             -- structured output from Claude parsing
  parsing_status text default 'pending'
    check (parsing_status in ('pending','processing','done','failed')),
  needs_user_clarification jsonb,  -- low-confidence OCR values
  user_clarifications jsonb,
  created_at timestamptz default now()
);

-- Row Level Security
alter table documents enable row level security;

create policy "Family members can view their documents"
  on documents for select
  using (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid()
    )
  );

create policy "Family members can insert documents"
  on documents for insert
  with check (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid()
    )
  );

create policy "Family members can update documents"
  on documents for update
  using (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid()
    )
  );

-- Index for fast member timeline queries
create index documents_member_id_date_idx on documents(member_id, document_date desc);
create index documents_parsing_status_idx on documents(parsing_status)
  where parsing_status = 'pending';
