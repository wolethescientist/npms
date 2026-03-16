// ─── Enums ───
export type UserRole = 'super_admin' | 'mda_admin' | 'policy_officer' | 'reviewer' | 'final_approver' | 'me_officer';
export type PolicyStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'rejected';
export type WorkflowStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';
export type IndicatorFrequency = 'monthly' | 'quarterly' | 'annually';

// ─── Tables ───
export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  mda_id: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface MDA {
  id: string;
  name: string;
  code: string;
  sector: string;
  created_at: string;
}

export interface Policy {
  id: string;
  title: string;
  body: string | null;
  status: PolicyStatus;
  version: number;
  mda_id: string;
  owner_id: string;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface WorkflowStep {
  id: string;
  policy_id: string;
  approver_id: string;
  step_order: number;
  status: WorkflowStepStatus;
  comment: string | null;
  actioned_at: string | null;
}

export interface Indicator {
  id: string;
  policy_id: string;
  name: string;
  baseline: number;
  target: number;
  unit: string;
  frequency: IndicatorFrequency;
}

export interface IndicatorReading {
  id: string;
  indicator_id: string;
  value: number;
  period: string;
  submitted_by: string;
  notes: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  diff: Record<string, unknown> | null;
  created_at: string;
}

// ─── Joined / Extended types ───
export interface PolicyWithRelations extends Policy {
  mda?: MDA;
  owner?: Profile;
  workflow_steps?: (WorkflowStep & { approver?: Profile })[];
  indicators?: Indicator[];
}

export interface IndicatorWithReadings extends Indicator {
  indicator_readings?: IndicatorReading[];
}

export interface AuditLogWithActor extends AuditLog {
  actor?: Profile;
}

export interface WorkflowStepWithApprover extends WorkflowStep {
  approver?: Profile;
}

// [NEW: Phase 2 workflow types]
export type StepRoleRequired = 'reviewer' | 'director' | 'final_approver';

export interface WorkflowTemplate {
  id: string;
  mda_id: string | null;
  name: string;
  created_at: string;
}

export interface WorkflowTemplateStep {
  id: string;
  template_id: string;
  step_order: number;
  role_required: StepRoleRequired;
  label: string;
}

// Extend existing WorkflowStep with Phase 2 fields
export interface WorkflowStepV2 extends WorkflowStep {
  step_label: string | null;
  role_required: StepRoleRequired | null;
  due_date: string | null;
  is_current: boolean;
  version: number;
}
// [END NEW]

// [NEW: Repository types]
export type PolicyType = 'act' | 'regulation' | 'guideline' | 'framework' | 'circular';

export interface PolicyVersion {
  id: string;
  policy_id: string;
  version: number;
  title: string;
  body: string | null;
  changed_by: string | null;
  summary: string | null;
  created_at: string;
}

// Extended Policy with repository fields
export interface PolicyWithRepositoryFields extends Policy {
  sector: string | null;
  policy_type: PolicyType | null;
  tags: string[];
  is_archived: boolean;
}

// ─── Phase 3: Monitoring types ───────────────────────────────
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type PolicyHealthStatus = 'on_track' | 'at_risk' | 'off_track' | 'no_data';

export interface PolicyMilestone {
  id: string;
  policy_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: MilestoneStatus;
  owner_id: string | null;
  created_at: string;
}

export interface ImplementationUpdate {
  id: string;
  policy_id: string;
  milestone_id: string | null;
  content: string;
  submitted_by: string;
  created_at: string;
}

// ─── Phase 5: Task Assignments ───────────────────────────────
export type TaskStatus   = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  policy_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface TaskWithRelations extends Task {
  policy_title?: string;
  assignee_name?: string;
  assigner_name?: string;
  milestone_title?: string;
}

// ─── Workflow Requests ────────────────────────────────────────
export type WorkflowRequestStatus = 'pending' | 'approved' | 'rejected' | 'noted';

export interface WorkflowRequest {
  id: string;
  title: string;
  description: string | null;
  action_requested: string;
  attachment_url: string | null;
  created_by: string;
  assigned_to: string;
  status: WorkflowRequestStatus;
  recipient_comment: string | null;
  actioned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRequestWithProfiles extends WorkflowRequest {
  creator?: Profile;
  assignee?: Profile;
}

// ─── Phase 4: Enhanced audit log ─────────────────────────────
export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogV2 extends AuditLog {
  severity: AuditSeverity;
  flagged: boolean;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
}
