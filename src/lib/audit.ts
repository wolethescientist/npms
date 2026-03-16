/**
 * Audit logging helper — never throws, always captures.
 *
 * In production this would use a server action + Supabase service-role client
 * (stored in SUPABASE_SERVICE_ROLE_KEY) so that RLS cannot block the write.
 * For this demo we use the anon client with an open INSERT policy.
 */

import { createClient } from '@/lib/supabase/client';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface LogActionParams {
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  diff?: Record<string, unknown> | null;
  severity?: AuditSeverity;
}

// Action name → automatic severity
const SEVERITY_MAP: Record<string, AuditSeverity> = {
  published:             'critical',
  rejected:              'critical',
  role_changed:          'critical',
  user_deleted:          'critical',
  submitted_for_review:  'warning',
  resubmitted:           'warning',
  step_overridden:       'warning',
};

export async function logAction(params: LogActionParams): Promise<void> {
  const { actor_id, entity_type, entity_id, action, diff, severity } = params;
  const resolvedSeverity: AuditSeverity =
    severity ?? SEVERITY_MAP[action] ?? 'info';

  try {
    const supabase = createClient();
    await supabase.from('audit_logs').insert({
      actor_id,
      entity_type,
      entity_id,
      action,
      diff: diff ?? null,
      severity: resolvedSeverity,
    });
  } catch (err) {
    // Silent — logging must never break the parent operation
    console.error('[logAction] Failed to write audit log:', { action, entity_type, entity_id, err });
  }
}
