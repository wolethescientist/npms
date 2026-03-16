-- ============================================================
-- Phase 2 Migration: Workflow Templates + Enhanced Workflow Steps
-- Idempotent — safe to run multiple times
-- ============================================================

BEGIN;

-- ── 1. Extend workflow_steps ──────────────────────────────────
ALTER TABLE workflow_steps
  ADD COLUMN IF NOT EXISTS step_label    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS role_required VARCHAR(20),
  ADD COLUMN IF NOT EXISTS due_date      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_current    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS version       INTEGER NOT NULL DEFAULT 1;

-- Allow approver_id to be null (set when someone actions the step)
ALTER TABLE workflow_steps ALTER COLUMN approver_id DROP NOT NULL;

-- Backfill existing rows
UPDATE workflow_steps SET role_required = 'reviewer' WHERE role_required IS NULL;
UPDATE workflow_steps SET step_label = 'Initial Review' WHERE step_label IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ws_policy_current
  ON workflow_steps (policy_id, is_current) WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_ws_policy_version
  ON workflow_steps (policy_id, version);

-- ── 2. workflow_templates ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mda_id     UUID REFERENCES mdas(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_mda
  ON workflow_templates (mda_id);

-- ── 3. workflow_template_steps ────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_template_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_order    INTEGER NOT NULL CHECK (step_order BETWEEN 1 AND 3),
  role_required VARCHAR(20) NOT NULL,
  label         VARCHAR(100) NOT NULL,
  UNIQUE (template_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_wts_template
  ON workflow_template_steps (template_id);

-- ── 4. RLS ───────────────────────────────────────────────────
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_template_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on workflow_templates" ON workflow_templates;
CREATE POLICY "Allow all on workflow_templates"
  ON workflow_templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on workflow_template_steps" ON workflow_template_steps;
CREATE POLICY "Allow all on workflow_template_steps"
  ON workflow_template_steps FOR ALL USING (true) WITH CHECK (true);

COMMIT;

-- ── Phase 2 Part 2: Policy Repository ─────────────────────────

-- New columns on policies
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS sector       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS policy_type  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tags         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_archived  BOOLEAN NOT NULL DEFAULT FALSE;

-- Full-text search column
ALTER TABLE policies
  DROP COLUMN IF EXISTS fts;

ALTER TABLE policies
  ADD COLUMN fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))
  ) STORED;

CREATE INDEX IF NOT EXISTS policies_fts_idx ON policies USING GIN(fts);
CREATE INDEX IF NOT EXISTS idx_policies_sector ON policies (sector);
CREATE INDEX IF NOT EXISTS idx_policies_type ON policies (policy_type);
CREATE INDEX IF NOT EXISTS idx_policies_archived ON policies (is_archived);

-- Policy versions table (snapshot per version)
CREATE TABLE IF NOT EXISTS policy_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id   UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  changed_by  UUID REFERENCES profiles(id),
  summary     VARCHAR(300),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (policy_id, version)
);

CREATE INDEX IF NOT EXISTS idx_pv_policy ON policy_versions (policy_id);

ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on policy_versions" ON policy_versions;
CREATE POLICY "Allow all on policy_versions"
  ON policy_versions FOR ALL USING (true) WITH CHECK (true);

-- ── Phase 3: Policy Monitoring ─────────────────────────────────

-- Milestone status enum (use VARCHAR for portability)
CREATE TABLE IF NOT EXISTS policy_milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id   UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  due_date    DATE NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','completed','overdue')),
  owner_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_policy ON policy_milestones (policy_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due    ON policy_milestones (due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON policy_milestones (status);

CREATE TABLE IF NOT EXISTS implementation_updates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id    UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES policy_milestones(id) ON DELETE SET NULL,
  content      TEXT NOT NULL,
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impl_policy   ON implementation_updates (policy_id);
CREATE INDEX IF NOT EXISTS idx_impl_created  ON implementation_updates (created_at DESC);

ALTER TABLE policy_milestones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE implementation_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on policy_milestones"      ON policy_milestones;
DROP POLICY IF EXISTS "Allow all on implementation_updates" ON implementation_updates;

CREATE POLICY "Allow all on policy_milestones"
  ON policy_milestones FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on implementation_updates"
  ON implementation_updates FOR ALL USING (true) WITH CHECK (true);

-- Seed: add some sample milestones for the first published policy
INSERT INTO policy_milestones (policy_id, title, description, due_date, status)
SELECT
  'c0000000-0000-0000-0000-000000000001',
  m.title, m.description, m.due_date::date, m.status
FROM (VALUES
  ('Phase 1 State Rollout',   'South-West and North-Central zones implementation', '2024-06-30', 'completed'),
  ('Digital Infrastructure',  'Set up digital health records in 500 PHCs',         '2024-09-30', 'completed'),
  ('Phase 2 State Rollout',   'South-East and North-West zones implementation',    '2024-12-31', 'in_progress'),
  ('Community Scheme Launch', 'Launch community-based schemes in 18 states',       '2025-03-31', 'pending'),
  ('Phase 3 State Rollout',   'South-South and North-East zones',                  '2025-09-30', 'pending')
) AS m(title, description, due_date, status)
WHERE NOT EXISTS (
  SELECT 1 FROM policy_milestones
  WHERE policy_id = 'c0000000-0000-0000-0000-000000000001'
);

-- ── Phase 4: Audit Trail Enhancement ──────────────────────────

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS ip_address  VARCHAR(45),
  ADD COLUMN IF NOT EXISTS user_agent  TEXT,
  ADD COLUMN IF NOT EXISTS session_id  UUID,
  ADD COLUMN IF NOT EXISTS severity    VARCHAR(10) NOT NULL DEFAULT 'info'
                             CHECK (severity IN ('info', 'warning', 'critical')),
  ADD COLUMN IF NOT EXISTS flagged     BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_flagged  ON audit_logs (flagged) WHERE flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity   ON audit_logs (entity_type, entity_id);

-- Backfill severity for existing rows based on action
UPDATE audit_logs SET severity = 'critical'
  WHERE action IN ('published', 'rejected', 'role_changed', 'user_deleted')
    AND severity = 'info';

UPDATE audit_logs SET severity = 'warning'
  WHERE action IN ('submitted_for_review', 'step_overridden', 'resubmitted')
    AND severity = 'info';

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- INSERT: open (service role bypasses RLS anyway; demo uses anon client)
DROP POLICY IF EXISTS "Allow insert audit_logs"  ON audit_logs;
CREATE POLICY "Allow insert audit_logs"
  ON audit_logs FOR INSERT WITH CHECK (true);

-- SELECT: open for demo (production would be scoped to role via JWT claims)
DROP POLICY IF EXISTS "Allow select audit_logs"  ON audit_logs;
CREATE POLICY "Allow select audit_logs"
  ON audit_logs FOR SELECT USING (true);

-- UPDATE: flagged column only — no other mutations
DROP POLICY IF EXISTS "Allow flag audit_logs" ON audit_logs;
CREATE POLICY "Allow flag audit_logs"
  ON audit_logs FOR UPDATE USING (true) WITH CHECK (true);

-- DELETE: no policy = always denied (immutable)

-- ── Phase 5: Task Assignments ──────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id    UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES policy_milestones(id) ON DELETE SET NULL,
  title        VARCHAR(300) NOT NULL,
  description  TEXT,
  assigned_to  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by  UUID NOT NULL REFERENCES profiles(id),
  status       VARCHAR(20) NOT NULL DEFAULT 'todo'
                 CHECK (status IN ('todo','in_progress','in_review','done','cancelled')),
  priority     VARCHAR(10) NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low','medium','high','critical')),
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_policy      ON tasks (policy_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks (assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date    ON tasks (due_date);

CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments (task_id);

ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Open policies for demo (production would use auth.uid() scoped policies)
DROP POLICY IF EXISTS "Allow all on tasks"         ON tasks;
DROP POLICY IF EXISTS "Allow all on task_comments" ON task_comments;

CREATE POLICY "Allow all on tasks"
  ON tasks FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on task_comments"
  ON task_comments FOR ALL USING (true) WITH CHECK (true);
