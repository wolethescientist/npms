-- ============================================================
-- Nigerian National Policy Management System – Schema
-- Run this in the Supabase SQL Editor (or via psql)
-- ============================================================

-- ── 1. Custom ENUM types ─────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'super_admin',
  'mda_admin',
  'policy_officer',
  'reviewer',
  'final_approver',
  'me_officer'
);

CREATE TYPE policy_status AS ENUM (
  'draft',
  'in_review',
  'approved',
  'published',
  'rejected'
);

CREATE TYPE workflow_step_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'skipped'
);

CREATE TYPE indicator_frequency AS ENUM (
  'monthly',
  'quarterly',
  'annually'
);


-- ── 2. Tables ────────────────────────────────────────────────

-- MDAs (Ministries, Departments & Agencies)
CREATE TABLE mdas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  code        text NOT NULL UNIQUE,
  sector      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  role        user_role NOT NULL DEFAULT 'policy_officer',
  mda_id      uuid REFERENCES mdas(id) ON DELETE SET NULL,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Policies
CREATE TABLE policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  body            text,
  status          policy_status NOT NULL DEFAULT 'draft',
  version         integer NOT NULL DEFAULT 1,
  mda_id          uuid NOT NULL REFERENCES mdas(id) ON DELETE RESTRICT,
  owner_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  attachment_url  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz
);

-- Workflow steps (approval chain for a policy)
CREATE TABLE workflow_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id   uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  step_order  integer NOT NULL,
  status      workflow_step_status NOT NULL DEFAULT 'pending',
  comment     text,
  actioned_at timestamptz,
  UNIQUE (policy_id, step_order)
);

-- M&E Indicators
CREATE TABLE indicators (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id   uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  baseline    numeric NOT NULL DEFAULT 0,
  target      numeric NOT NULL,
  unit        text NOT NULL,
  frequency   indicator_frequency NOT NULL DEFAULT 'quarterly'
);

-- Indicator readings (periodic values)
CREATE TABLE indicator_readings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id  uuid NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  value         numeric NOT NULL,
  period        text NOT NULL,
  submitted_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  entity_type text NOT NULL,
  entity_id   text NOT NULL,
  action      text NOT NULL,
  diff        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ── 3. Indexes ───────────────────────────────────────────────
CREATE INDEX idx_policies_status      ON policies   (status);
CREATE INDEX idx_policies_mda         ON policies   (mda_id);
CREATE INDEX idx_policies_owner       ON policies   (owner_id);
CREATE INDEX idx_workflow_policy      ON workflow_steps (policy_id);
CREATE INDEX idx_indicators_policy    ON indicators (policy_id);
CREATE INDEX idx_readings_indicator   ON indicator_readings (indicator_id);
CREATE INDEX idx_audit_entity         ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_actor          ON audit_logs (actor_id);


-- ── 4. Auto-update updated_at trigger ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ── 5. Row Level Security ────────────────────────────────────

ALTER TABLE mdas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps    ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators        ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;

-- MDAs: everyone can read
CREATE POLICY "MDAs are publicly readable"
  ON mdas FOR SELECT USING (true);

-- Profiles: authenticated can read; users update own row
CREATE POLICY "Profiles are readable by authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policies: authenticated can read; owners & admins can insert/update
CREATE POLICY "Policies readable by authenticated"
  ON policies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Published policies are public"
  ON policies FOR SELECT USING (status = 'published');

CREATE POLICY "Owners can insert policies"
  ON policies FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own policies"
  ON policies FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Workflow steps: authenticated read; approvers can update own step
CREATE POLICY "Workflow steps readable by authenticated"
  ON workflow_steps FOR SELECT TO authenticated USING (true);

CREATE POLICY "Approvers can update own step"
  ON workflow_steps FOR UPDATE TO authenticated
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

-- Indicators & readings: authenticated can read; ME officers insert readings
CREATE POLICY "Indicators readable by authenticated"
  ON indicators FOR SELECT TO authenticated USING (true);

CREATE POLICY "Indicator readings readable by authenticated"
  ON indicator_readings FOR SELECT TO authenticated USING (true);

CREATE POLICY "ME officers can insert readings"
  ON indicator_readings FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

-- Audit logs: authenticated can read only
CREATE POLICY "Audit logs readable by authenticated"
  ON audit_logs FOR SELECT TO authenticated USING (true);


-- ── 6. Storage bucket policies ───────────────────────────────
-- (Bucket 'policy-documents' must be created in the Dashboard)

CREATE POLICY "Authenticated users can upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'policy-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can read policy documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'policy-documents');
