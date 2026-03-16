import { createClient } from '@/lib/supabase/client';
import { logAction } from '@/lib/audit';
import type { StepRoleRequired } from '@/lib/types/database.types';

// Maps step role_required to the user roles that can action it
const ROLE_MAP: Record<StepRoleRequired, string[]> = {
  reviewer:       ['reviewer'],
  director:       ['mda_admin', 'super_admin'],
  final_approver: ['final_approver', 'super_admin'],
};

const DEFAULT_STEPS: { step_order: number; role_required: StepRoleRequired; step_label: string }[] = [
  { step_order: 1, role_required: 'reviewer',       step_label: 'Initial Review'    },
  { step_order: 2, role_required: 'director',        step_label: 'Director Approval' },
  { step_order: 3, role_required: 'final_approver',  step_label: 'Final Approval'    },
];

export function canActionStep(userRole: string, roleRequired: StepRoleRequired): boolean {
  return ROLE_MAP[roleRequired]?.includes(userRole) ?? false;
}

export async function submitForReview(policyId: string, actorId: string): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: policy, error: pErr } = await supabase
    .from('policies')
    .select('id, status, version')
    .eq('id', policyId)
    .single();

  if (pErr || !policy) return { error: 'Policy not found.' };
  if (policy.status !== 'draft' && policy.status !== 'rejected') {
    return { error: 'Only draft or rejected policies can be submitted.' };
  }

  const newVersion = policy.status === 'rejected' ? policy.version + 1 : policy.version;
  const isResubmission = policy.status === 'rejected';

  const { error: updateErr } = await supabase
    .from('policies')
    .update({ status: 'in_review', version: newVersion, updated_at: new Date().toISOString() })
    .eq('id', policyId);

  if (updateErr) return { error: updateErr.message };

  const steps = DEFAULT_STEPS.map((s) => ({
    policy_id:     policyId,
    approver_id:   null,
    step_order:    s.step_order,
    step_label:    s.step_label,
    role_required: s.role_required,
    status:        'pending' as const,
    is_current:    s.step_order === 1,
    version:       newVersion,
    comment:       null,
    actioned_at:   null,
  }));

  const { error: stepsErr } = await supabase.from('workflow_steps').insert(steps);
  if (stepsErr) return { error: stepsErr.message };

  await logAction({
    actor_id:    actorId,
    entity_type: 'policy',
    entity_id:   policyId,
    action:      isResubmission ? 'resubmitted' : 'submitted_for_review',
    diff:        { version: newVersion, status: 'in_review' },
    severity:    isResubmission ? 'warning' : 'info',
  });

  return {};
}

export async function approveStep(
  stepId: string,
  policyId: string,
  actorId: string,
  actorRole: string,
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: step, error: sErr } = await supabase
    .from('workflow_steps')
    .select('id, step_order, role_required, is_current, status, version')
    .eq('id', stepId)
    .single();

  if (sErr || !step) return { error: 'Step not found.' };
  if (!step.is_current || step.status !== 'pending') return { error: 'This step is not currently actionable.' };
  if (!canActionStep(actorRole, step.role_required as StepRoleRequired)) {
    return { error: 'You do not have permission to action this step.' };
  }

  const now = new Date().toISOString();

  const { error: approveErr } = await supabase
    .from('workflow_steps')
    .update({ status: 'approved', is_current: false, approver_id: actorId, actioned_at: now })
    .eq('id', stepId);

  if (approveErr) return { error: approveErr.message };

  const { data: nextStep } = await supabase
    .from('workflow_steps')
    .select('id, step_order')
    .eq('policy_id', policyId)
    .eq('version', step.version)
    .eq('step_order', step.step_order + 1)
    .single();

  if (nextStep) {
    await supabase.from('workflow_steps').update({ is_current: true }).eq('id', nextStep.id);
  } else {
    await supabase
      .from('policies')
      .update({ status: 'approved', updated_at: now })
      .eq('id', policyId);
  }

  await logAction({
    actor_id:    actorId,
    entity_type: 'workflow_step',
    entity_id:   stepId,
    action:      'approved',
    diff:        { step_order: step.step_order, next_step: nextStep?.step_order ?? 'final', policy_id: policyId },
    severity:    'info',
  });

  return {};
}

export async function rejectStep(
  stepId: string,
  policyId: string,
  actorId: string,
  actorRole: string,
  comment: string,
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: step, error: sErr } = await supabase
    .from('workflow_steps')
    .select('id, step_order, role_required, is_current, status, version')
    .eq('id', stepId)
    .single();

  if (sErr || !step) return { error: 'Step not found.' };
  if (!step.is_current || step.status !== 'pending') return { error: 'This step is not currently actionable.' };
  if (!canActionStep(actorRole, step.role_required as StepRoleRequired)) {
    return { error: 'You do not have permission to action this step.' };
  }

  const now = new Date().toISOString();

  await supabase
    .from('workflow_steps')
    .update({ status: 'rejected', is_current: false, approver_id: actorId, comment, actioned_at: now })
    .eq('id', stepId);

  await supabase
    .from('workflow_steps')
    .update({ is_current: false })
    .eq('policy_id', policyId)
    .eq('version', step.version)
    .eq('status', 'pending');

  await supabase
    .from('policies')
    .update({ status: 'rejected', updated_at: now })
    .eq('id', policyId);

  await logAction({
    actor_id:    actorId,
    entity_type: 'policy',
    entity_id:   policyId,
    action:      'rejected',
    diff:        { comment, step_order: step.step_order, step_id: stepId },
    severity:    'critical',
  });

  return {};
}

export async function publishPolicy(policyId: string, actorId: string, actorRole: string): Promise<{ error?: string }> {
  if (!['mda_admin', 'super_admin'].includes(actorRole)) {
    return { error: 'Only MDA Admins can publish policies.' };
  }

  const supabase = createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('policies')
    .update({ status: 'published', published_at: now, updated_at: now })
    .eq('id', policyId)
    .eq('status', 'approved');

  if (error) return { error: error.message };

  await logAction({
    actor_id:    actorId,
    entity_type: 'policy',
    entity_id:   policyId,
    action:      'published',
    diff:        { published_at: now, status: 'published' },
    severity:    'critical',
  });

  return {};
}
