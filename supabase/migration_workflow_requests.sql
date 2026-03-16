-- ─── Workflow Requests ───────────────────────────────────────────────────────
-- General-purpose workflow request system: any user can create a request,
-- assign it to any other user, and the recipient can act on it.

CREATE TABLE IF NOT EXISTS workflow_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT,
  action_requested TEXT        NOT NULL,
  attachment_url   TEXT,
  created_by       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected', 'noted')),
  recipient_comment TEXT,
  actioned_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wr_assigned_to ON workflow_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_wr_created_by  ON workflow_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_wr_status      ON workflow_requests(status);

-- RLS (open for demo)
ALTER TABLE workflow_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workflow_requests' AND policyname = 'allow_all_workflow_requests'
  ) THEN
    CREATE POLICY "allow_all_workflow_requests"
      ON workflow_requests FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;
