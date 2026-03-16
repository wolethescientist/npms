'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { profiles as mockProfiles, policies as mockPolicies } from '@/lib/mock-data';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TaskSheet from '@/components/tasks/TaskSheet';
import AddTaskDialog from '@/components/tasks/AddTaskDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { updateTaskStatus } from '@/lib/actions/tasks';
import { toast } from 'sonner';
import { ArrowLeft, Plus, ListChecks } from 'lucide-react';
import type { TaskWithRelations, TaskStatus, Profile } from '@/lib/types/database.types';

const CAN_CREATE = ['policy_officer', 'mda_admin', 'super_admin'];

export default function PolicyTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: policyId } = use(params);

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [policyTitle, setPolicyTitle] = useState('');
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('demo_user');
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  // Load policy title
  useEffect(() => {
    const mock = mockPolicies.find((p) => p.id === policyId);
    if (mock) { setPolicyTitle(mock.title); return; }
    const supabase = createClient();
    supabase.from('policies').select('title').eq('id', policyId).single()
      .then(({ data }) => { if (data) setPolicyTitle(data.title); });
  }, [policyId]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('policy_id', policyId)
      .neq('status', 'cancelled')
      .order('due_date', { ascending: true, nullsFirst: false });

    const raw = data ?? [];

    // Enrich
    let allProfiles: Profile[] = mockProfiles;
    const { data: dbProfiles } = await supabase.from('profiles').select('*');
    if (dbProfiles && dbProfiles.length > 0) allProfiles = dbProfiles;

    const enriched: TaskWithRelations[] = await Promise.all(
      raw.map(async (t) => {
        const assignee = allProfiles.find((p) => p.id === t.assigned_to);
        const assigner = allProfiles.find((p) => p.id === t.assigned_by);
        return {
          ...t,
          assignee_name: assignee?.full_name,
          assigner_name: assigner?.full_name,
          policy_title: policyTitle,
        };
      })
    );

    setTasks(enriched);
    setLoading(false);
  }, [policyId, policyTitle]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    if (!currentUser) return;
    const result = await updateTaskStatus(taskId, newStatus, currentUser.id);
    if (result.error) { toast.error(result.error); return; }
    toast.success('Status updated');
    loadTasks();
  }

  function handleTaskClick(task: TaskWithRelations) {
    setSelectedTask(task);
    setSheetOpen(true);
  }

  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const canCreate = currentUser && CAN_CREATE.includes(currentUser.role);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
            <Link href={`/policies/${policyId}`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#0F6E56]" />
              <h1 className="text-xl font-bold text-foreground tracking-tight">Tasks</h1>
            </div>
            {policyTitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{policyTitle}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {todoCount} to do · {doneCount} done
            </p>
          </div>
        </div>
        {canCreate && (
          <Button
            size="sm"
            className="bg-[#0F6E56] hover:bg-[#085041] gap-2 shrink-0"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        )}
      </div>

      {/* Board */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-3 space-y-2 min-h-[520px]">
              <Skeleton className="h-8 w-full rounded-lg" />
              {Array.from({ length: 2 }).map((__, j) => (
                <Skeleton key={j} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onTaskClick={handleTaskClick}
          showPolicyName={false}
        />
      )}

      <TaskSheet
        task={selectedTask}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        currentUser={currentUser}
        onTaskUpdated={() => {
          loadTasks();
          setSheetOpen(false);
        }}
      />

      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        policyId={policyId}
        currentUser={currentUser}
        onTaskCreated={loadTasks}
      />
    </div>
  );
}
