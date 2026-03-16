import { createClient } from '@/lib/supabase/client';
import { logAction } from '@/lib/audit';
import { profiles as mockProfiles } from '@/lib/mock-data';
import type { TaskStatus, TaskPriority } from '@/lib/types/database.types';

const CAN_CREATE  = ['policy_officer', 'mda_admin', 'super_admin'];
const CAN_MANAGE  = ['mda_admin', 'super_admin'];

// Permission: fetch role from DB (never trust client-sent role)
async function getActorProfile(actorId: string) {
  const mock = mockProfiles.find((p) => p.id === actorId);
  if (mock) return { id: mock.id, role: mock.role, mda_id: mock.mda_id };

  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, role, mda_id')
    .eq('id', actorId)
    .single();
  return data ?? null;
}

export interface CreateTaskInput {
  policy_id: string;
  milestone_id?: string | null;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  assigned_by: string;
  priority?: TaskPriority;
  due_date?: string | null;
}

export async function createTask(input: CreateTaskInput): Promise<{ id?: string; error?: string }> {
  const actor = await getActorProfile(input.assigned_by);
  if (!actor || !CAN_CREATE.includes(actor.role)) {
    return { error: 'You do not have permission to create tasks.' };
  }

  const supabase = createClient();
  const { data: inserted, error } = await supabase
    .from('tasks')
    .insert({
      policy_id:    input.policy_id,
      milestone_id: input.milestone_id ?? null,
      title:        input.title.trim(),
      description:  input.description?.trim() ?? null,
      assigned_to:  input.assigned_to ?? null,
      assigned_by:  input.assigned_by,
      priority:     input.priority ?? 'medium',
      due_date:     input.due_date ?? null,
      status:       'todo',
      updated_at:   new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await logAction({
    actor_id:    input.assigned_by,
    entity_type: 'task',
    entity_id:   inserted.id,
    action:      'task_created',
    diff:        { title: input.title, policy_id: input.policy_id, priority: input.priority ?? 'medium' },
    severity:    'info',
  });

  return { id: inserted.id };
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  actorId: string,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: task } = await supabase
    .from('tasks')
    .select('assigned_to, assigned_by, status')
    .eq('id', taskId)
    .single();

  const actor = await getActorProfile(actorId);
  if (!actor) return { error: 'Actor not found.' };

  const canUpdate =
    task?.assigned_to === actorId ||
    task?.assigned_by === actorId ||
    CAN_MANAGE.includes(actor.role);

  if (!canUpdate) return { error: 'You do not have permission to update this task.' };

  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) return { error: error.message };

  await logAction({
    actor_id:    actorId,
    entity_type: 'task',
    entity_id:   taskId,
    action:      'task_status_updated',
    diff:        { status: newStatus, prev_status: task?.status },
    severity:    'info',
  });

  return {};
}

export async function completeTask(taskId: string, actorId: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: task } = await supabase
    .from('tasks')
    .select('assigned_to, assigned_by')
    .eq('id', taskId)
    .single();

  const actor = await getActorProfile(actorId);
  if (!actor) return { error: 'Actor not found.' };

  const canUpdate =
    task?.assigned_to === actorId ||
    task?.assigned_by === actorId ||
    CAN_MANAGE.includes(actor.role);

  if (!canUpdate) return { error: 'You do not have permission to complete this task.' };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'done', completed_at: now, updated_at: now })
    .eq('id', taskId);

  if (error) return { error: error.message };

  await logAction({
    actor_id:    actorId,
    entity_type: 'task',
    entity_id:   taskId,
    action:      'task_completed',
    diff:        { completed_at: now },
    severity:    'info',
  });

  return {};
}

export async function addTaskComment(
  taskId: string,
  content: string,
  authorId: string,
): Promise<{ error?: string }> {
  if (!content.trim()) return { error: 'Comment content is required.' };

  const supabase = createClient();
  const { error } = await supabase.from('task_comments').insert({
    task_id:   taskId,
    author_id: authorId,
    content:   content.trim(),
  });

  return error ? { error: error.message } : {};
}

export async function deleteTask(taskId: string, actorId: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: task } = await supabase
    .from('tasks')
    .select('assigned_by, title')
    .eq('id', taskId)
    .single();

  const actor = await getActorProfile(actorId);
  if (!actor) return { error: 'Actor not found.' };

  const canDelete = task?.assigned_by === actorId || CAN_MANAGE.includes(actor.role);
  if (!canDelete) return { error: 'You do not have permission to delete this task.' };

  // Soft delete: set status = cancelled
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) return { error: error.message };

  await logAction({
    actor_id:    actorId,
    entity_type: 'task',
    entity_id:   taskId,
    action:      'task_deleted',
    diff:        { title: task?.title },
    severity:    'warning',
  });

  return {};
}

export async function updateTask(
  taskId: string,
  updates: Partial<{ title: string; description: string | null; due_date: string | null; priority: TaskPriority; assigned_to: string | null }>,
  actorId: string,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: task } = await supabase
    .from('tasks')
    .select('assigned_by')
    .eq('id', taskId)
    .single();

  const actor = await getActorProfile(actorId);
  if (!actor) return { error: 'Actor not found.' };

  const canEdit = task?.assigned_by === actorId || CAN_MANAGE.includes(actor.role);
  if (!canEdit) return { error: 'You do not have permission to edit this task.' };

  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) return { error: error.message };

  await logAction({
    actor_id:    actorId,
    entity_type: 'task',
    entity_id:   taskId,
    action:      'task_updated',
    diff:        updates as Record<string, unknown>,
    severity:    'info',
  });

  return {};
}
