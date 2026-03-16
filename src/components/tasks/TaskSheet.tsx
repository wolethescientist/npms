'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Calendar, User, Flag, CheckCircle2, Trash2, Edit3, MessageSquare,
  Loader2, Send, AlertCircle, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  updateTaskStatus, completeTask, deleteTask, addTaskComment, updateTask,
} from '@/lib/actions/tasks';
import { createClient } from '@/lib/supabase/client';
import type { TaskWithRelations, TaskStatus, TaskPriority, Profile } from '@/lib/types/database.types';
import { PRIORITY_CFG } from './KanbanBoard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

interface TaskSheetProps {
  task: TaskWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: Profile | null;
  onTaskUpdated: () => void;
}

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo',        label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review',   label: 'In Review' },
  { value: 'done',        label: 'Done' },
];

const STATUS_BADGE: Record<TaskStatus, string> = {
  todo:        'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review:   'bg-amber-100 text-amber-700',
  done:        'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-red-100 text-red-700',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskSheet({
  task,
  open,
  onOpenChange,
  currentUser,
  onTaskUpdated,
}: TaskSheetProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [savingEdit, setSavingEdit] = useState(false);

  const canManage =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'mda_admin' ||
    task?.assigned_by === currentUser?.id;

  const canUpdateStatus =
    canManage || task?.assigned_to === currentUser?.id;

  // Load comments when task changes
  useEffect(() => {
    if (!task || !open) return;
    loadComments(task.id);
    setCommentText('');
    setEditing(false);
  }, [task?.id, open]);

  async function loadComments(taskId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('task_comments')
      .select('id, task_id, author_id, content, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (!data) return;

    // Enrich with author names (best-effort)
    const { profiles } = await import('@/lib/mock-data');
    const enriched: TaskComment[] = data.map((c) => ({
      ...c,
      author_name: profiles.find((p) => p.id === c.author_id)?.full_name ?? 'Unknown',
    }));
    setComments(enriched);
  }

  function startEditing() {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    setEditDueDate(task.due_date ?? '');
    setEditPriority(task.priority);
    setEditing(true);
  }

  async function handleSaveEdit() {
    if (!task || !currentUser) return;
    setSavingEdit(true);
    const result = await updateTask(
      task.id,
      {
        title: editTitle.trim() || task.title,
        description: editDescription.trim() || null,
        due_date: editDueDate || null,
        priority: editPriority,
      },
      currentUser.id,
    );
    setSavingEdit(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success('Task updated');
    setEditing(false);
    onTaskUpdated();
  }

  async function handleStatusChange(newStatus: TaskStatus) {
    if (!task || !currentUser) return;
    setUpdatingStatus(true);
    const result = await updateTaskStatus(task.id, newStatus, currentUser.id);
    setUpdatingStatus(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success('Status updated');
    onTaskUpdated();
  }

  async function handleComplete() {
    if (!task || !currentUser) return;
    setCompleting(true);
    const result = await completeTask(task.id, currentUser.id);
    setCompleting(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success('Task marked complete');
    onTaskUpdated();
  }

  async function handleDelete() {
    if (!task || !currentUser) return;
    setDeleting(true);
    const result = await deleteTask(task.id, currentUser.id);
    setDeleting(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success('Task deleted');
    setDeleteDialogOpen(false);
    onOpenChange(false);
    onTaskUpdated();
  }

  async function handleAddComment() {
    if (!task || !currentUser || !commentText.trim()) return;
    setSubmittingComment(true);
    const result = await addTaskComment(task.id, commentText, currentUser.id);
    setSubmittingComment(false);
    if (result.error) { toast.error(result.error); return; }
    setCommentText('');
    loadComments(task.id);
  }

  const today = new Date().toISOString().split('T')[0];
  const isOverdue =
    task?.due_date &&
    task.due_date < today &&
    task.status !== 'done' &&
    task.status !== 'cancelled';

  function getInitials(name?: string) {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  if (!task) return null;

  const pCfg = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.medium;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-start gap-3 pr-8">
              <span className={cn('mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', pCfg.bg, pCfg.color)}>
                {pCfg.label}
              </span>
              <div className="min-w-0">
                {editing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-sm font-semibold h-7 px-2"
                  />
                ) : (
                  <SheetTitle className="text-sm font-semibold leading-snug">{task.title}</SheetTitle>
                )}
                {task.policy_title && (
                  <SheetDescription className="text-[11px] mt-0.5">{task.policy_title}</SheetDescription>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Status + actions row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', STATUS_BADGE[task.status])}>
                {STATUS_OPTIONS.find((s) => s.value === task.status)?.label ?? task.status}
              </span>
              {canUpdateStatus && task.status !== 'done' && task.status !== 'cancelled' && (
                <Select
                  value={task.status}
                  onValueChange={(v) => handleStatusChange((v ?? task.status) as TaskStatus)}
                >
                  <SelectTrigger size="sm" className="w-auto text-[11px] h-6 border-dashed">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {updatingStatus && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3">
              {task.assignee_name && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Assigned to <span className="text-foreground font-medium">{task.assignee_name}</span></span>
                </div>
              )}
              {task.assigner_name && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Flag className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">By <span className="text-foreground font-medium">{task.assigner_name}</span></span>
                </div>
              )}
              {task.due_date && (
                <div className={cn('flex items-center gap-2 text-xs', isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
                  {isOverdue ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <Calendar className="w-3.5 h-3.5 shrink-0" />}
                  <span>
                    Due {new Date(task.due_date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {isOverdue && ' · Overdue'}
                  </span>
                </div>
              )}
              {task.milestone_title && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{task.milestone_title}</span>
                </div>
              )}
            </div>

            {/* Edit fields */}
            {editing ? (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Task description…"
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due date</Label>
                    <Input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Priority</Label>
                    <Select
                      value={editPriority}
                      onValueChange={(v) => setEditPriority((v ?? 'medium') as TaskPriority)}
                    >
                      <SelectTrigger size="sm" className="text-xs h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map((p) => (
                          <SelectItem key={p} value={p}>{PRIORITY_CFG[p].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit} className="bg-[#0F6E56] hover:bg-[#085041] h-7 text-xs">
                    {savingEdit ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7 text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              task.description && (
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{task.description}</p>
                </div>
              )
            )}

            <Separator />

            {/* Comments */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-foreground">Comments ({comments.length})</p>
              </div>
              {comments.length === 0 && (
                <p className="text-[11px] text-muted-foreground/60 text-center py-4">No comments yet</p>
              )}
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#0F6E56]/15 text-[#0F6E56] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {getInitials(c.author_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[11px] font-semibold text-foreground">{c.author_name}</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(c.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 whitespace-pre-line">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comment input */}
              {currentUser && (
                <div className="flex gap-2 items-end pt-1">
                  <div className="w-6 h-6 rounded-full bg-[#0F6E56]/15 text-[#0F6E56] text-[9px] font-bold flex items-center justify-center shrink-0">
                    {getInitials(currentUser.full_name)}
                  </div>
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    rows={2}
                    className="text-xs resize-none flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment();
                    }}
                  />
                  <Button
                    size="icon"
                    className="bg-[#0F6E56] hover:bg-[#085041] h-8 w-8 shrink-0"
                    onClick={handleAddComment}
                    disabled={submittingComment || !commentText.trim()}
                  >
                    {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          {(canUpdateStatus || canManage) && task.status !== 'cancelled' && (
            <div className="border-t border-border px-5 py-3 flex items-center gap-2 flex-wrap">
              {canUpdateStatus && task.status !== 'done' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs gap-1.5"
                  onClick={handleComplete}
                  disabled={completing}
                >
                  {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Mark Complete
                </Button>
              )}
              {canManage && !editing && (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={startEditing}>
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </Button>
              )}
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 ml-auto"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will cancel the task <span className="font-semibold text-foreground">&ldquo;{task.title}&rdquo;</span>. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
