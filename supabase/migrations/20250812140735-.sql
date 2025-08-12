-- Create schema and core tables for Reggio MVP
-- Safe idempotency helpers
create schema if not exists reggio;

-- Enable useful extensions
create extension if not exists pg_trgm;
create extension if not exists vector;

-- Enums for strong typing
DO $$ BEGIN
  CREATE TYPE reggio.obligation_type AS ENUM (
    'MANDATORY','RECOMMENDED','REPORTING','DISCLOSURE','RESTRICTION','GOVERNANCE','RISK_MANAGEMENT','RECORD_KEEPING'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reggio.risk_area AS ENUM (
    'LIQUIDITY','CAPITAL','MARKET','CREDIT','OPERATIONAL','CONDUCT','AML_CFT','DATA_PRIVACY','TECH_RISK','OUTSOURCING','IRRBB','RRP'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Organizations and membership
create table if not exists reggio.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists reggio.org_members (
  org_id uuid not null references reggio.organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Regulations and documents
create table if not exists reggio.regulations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references reggio.organizations(id) on delete cascade,
  title text not null,
  short_code text not null unique,
  jurisdiction text,
  regulator text,
  created_at timestamptz not null default now()
);

create table if not exists reggio.regulation_documents (
  id uuid primary key default gen_random_uuid(),
  regulation_id uuid not null references reggio.regulations(id) on delete cascade,
  version_label text,
  doc_type text,
  language text,
  source_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (regulation_id, source_url, version_label)
);

-- Clauses and obligations
create table if not exists reggio.clauses (
  id uuid primary key default gen_random_uuid(),
  regulation_id uuid not null references reggio.regulations(id) on delete cascade,
  document_id uuid references reggio.regulation_documents(id) on delete set null,
  path_hierarchy text,
  number_label text,
  text_raw text not null,
  summary_plain text,
  obligation_type reggio.obligation_type,
  risk_area reggio.risk_area,
  themes text[],
  industries text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Search indexes
create index if not exists idx_reggio_clauses_text_raw_trgm on reggio.clauses using gin (text_raw gin_trgm_ops);
create index if not exists idx_reggio_clauses_summary_trgm on reggio.clauses using gin (summary_plain gin_trgm_ops);
create index if not exists idx_reggio_clauses_risk_area on reggio.clauses(risk_area);
create index if not exists idx_reggio_clauses_obligation_type on reggio.clauses(obligation_type);

-- Embeddings (optional, Phase-2 ready)
create table if not exists reggio.clause_embeddings (
  clause_id uuid primary key references reggio.clauses(id) on delete cascade,
  embedding vector(768)
);

create table if not exists reggio.obligations (
  id uuid primary key default gen_random_uuid(),
  clause_id uuid not null references reggio.clauses(id) on delete cascade,
  description text not null,
  due_date_estimate text,
  related_clause_path text,
  created_at timestamptz not null default now()
);

-- Generated reports for Board Briefs
create table if not exists reggio.generated_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references reggio.organizations(id) on delete cascade,
  regulation_id uuid references reggio.regulations(id) on delete set null,
  title text not null,
  content_markdown text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- Timestamp trigger for updated_at
create or replace function reggio.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

DO $$ BEGIN
  create trigger trg_reggio_clauses_updated_at
  before update on reggio.clauses
  for each row execute function reggio.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS
alter table reggio.organizations enable row level security;
alter table reggio.org_members enable row level security;
alter table reggio.regulations enable row level security;
alter table reggio.regulation_documents enable row level security;
alter table reggio.clauses enable row level security;
alter table reggio.obligations enable row level security;
alter table reggio.generated_reports enable row level security;

-- Policies
-- org_members: users can see/insert their own membership
DO $$ BEGIN
  create policy "View own memberships" on reggio.org_members for select using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own membership" on reggio.org_members for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Delete own membership" on reggio.org_members for delete using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- organizations: members can view
DO $$ BEGIN
  create policy "Members view organizations" on reggio.organizations for select using (
    exists (
      select 1 from reggio.org_members m where m.org_id = reggio.organizations.id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- regulations: members can CRUD
DO $$ BEGIN
  create policy "Members select regulations" on reggio.regulations for select using (
    exists (
      select 1 from reggio.org_members m where m.org_id = reggio.regulations.org_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Members insert regulations" on reggio.regulations for insert with check (
    exists (
      select 1 from reggio.org_members m where m.org_id = org_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Members update regulations" on reggio.regulations for update using (
    exists (
      select 1 from reggio.org_members m where m.org_id = reggio.regulations.org_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Members delete regulations" on reggio.regulations for delete using (
    exists (
      select 1 from reggio.org_members m where m.org_id = reggio.regulations.org_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- regulation_documents: members can CRUD if their org owns the regulation
DO $$ BEGIN
  create policy "Members select documents" on reggio.regulation_documents for select using (
    exists (
      select 1 from reggio.regulations r
      join reggio.org_members m on m.org_id = r.org_id
      where r.id = regulation_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Members modify documents" on reggio.regulation_documents for all using (
    exists (
      select 1 from reggio.regulations r
      join reggio.org_members m on m.org_id = r.org_id
      where r.id = regulation_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from reggio.regulations r
      join reggio.org_members m on m.org_id = r.org_id
      where r.id = regulation_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- clauses: members can CRUD via related regulation
DO $$ BEGIN
  create policy "Members select clauses" on reggio.clauses for select using (
    exists (
      select 1 from reggio.regulations r
      join reggio.org_members m on m.org_id = r.org_id
      where r.id = regulation_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Members modify clauses" on reggio.clauses for all using (
    exists (
      select 1 from reggio.regulations r
      join reggio.org_members m on m.org_id = r.org_id
      where r.id = regulation_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from reggio.regulations r
      join reggio.org_members m on m.org_id = r.org_id
      where r.id = regulation_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- obligations: via clause/regulation
DO $$ BEGIN
  create policy "Members select obligations" on reggio.obligations for select using (
    exists (
      select 1 from reggio.clauses c
      join reggio.regulations r on r.id = c.regulation_id
      join reggio.org_members m on m.org_id = r.org_id
      where c.id = clause_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Members modify obligations" on reggio.obligations for all using (
    exists (
      select 1 from reggio.clauses c
      join reggio.regulations r on r.id = c.regulation_id
      join reggio.org_members m on m.org_id = r.org_id
      where c.id = clause_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from reggio.clauses c
      join reggio.regulations r on r.id = c.regulation_id
      join reggio.org_members m on m.org_id = r.org_id
      where c.id = clause_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- generated_reports: members can CRUD within their org
DO $$ BEGIN
  create policy "Members select reports" on reggio.generated_reports for select using (
    exists (
      select 1 from reggio.org_members m where m.org_id = reggio.generated_reports.org_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Members modify reports" on reggio.generated_reports for all using (
    exists (
      select 1 from reggio.org_members m where m.org_id = reggio.generated_reports.org_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from reggio.org_members m where m.org_id = org_id and m.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed org and regulation
-- Replace with provided IDs
INSERT INTO reggio.organizations (id, name)
VALUES ('d3546758-a241-4546-aff7-fa600731502a', 'Reggio Demo Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reggio.org_members (org_id, user_id, role)
VALUES ('d3546758-a241-4546-aff7-fa600731502a', 'fd91ae89-4f12-42d5-96ab-55691454e45f', 'owner')
ON CONFLICT DO NOTHING;

INSERT INTO reggio.regulations (org_id, title, short_code, jurisdiction, regulator)
VALUES (
  'd3546758-a241-4546-aff7-fa600731502a',
  'PRA Liquidity (Test Extract)',
  'PRA-LIQ-TEST',
  'UK',
  'PRA'
)
ON CONFLICT (short_code) DO NOTHING;