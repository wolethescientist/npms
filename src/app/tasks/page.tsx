'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { profiles as mockProfiles } from '@/lib/mock-data';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TaskSheet from '@/components/tasks/TaskSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ListChecks, Search, SlidersHorizontal } from 'lucide-react';
import { updateTaskStatus } from '@/lib/actions/tasks';
import { toast } from 'sonner';
import type { TaskWithRelations, TaskStatus, TaskPriority, Profile } from '@/lib/types/database.types';

type TabMode = 'assigned_to_me' | 'assigned_by_me';
type PriorityFilter = 'all' | TaskPriority;

export default function TasksPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabMode>('assigned_to_me');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('demo_user');
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  const loadTasks = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);

    const supabase = createClient();
    const col = tab === 'assigned_to_me' ? 'assigned_to' : 'assigned_by';

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq(col, currentUser.id)
      .neq('status', 'cancelled')
      .order('due_date', { ascending: true, nullsFirst: false });

    const raw = data ?? [];

    // Enrich with names
    const allProfiles = await getAllProfiles();
    const enriched: TaskWithRelations[] = await Promise.all(
      raw.map(async (t) => {
        const assignee = allProfiles.find((p) => p.id === t.assigned_to);
        const assigner = allProfiles.find((p) => p.id === t.assigned_by);
        // Get policy title
        const { data: policy } = await supabase
          .from('policies')
          .select('title')
          .eq('id', t.policy_id)
          .single();
        return {
          ...t,
          assignee_name: assignee?.full_name,
          assigner_name: assigner?.full_name,
          policy_title: policy?.title,
        };
      })
    );

    setTasks(enriched);
    setLoading(false);
  }, [currentUser, tab]);

  useEffect(() => {
    if (currentUser) loadTasks();
  }, [currentUser, loadTasks]);

  async function getAllProfiles(): Promise<Profile[]> {
    const supabase = createClient();
    const { data } = await supabase.from('profiles').select('*');
    if (data && data.length > 0) return data;
    return mockProfiles;
  }

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

  // Apply filters
  const filtered = tasks.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.policy_title ?? '').toLowerCase().includes(q)) {
        return false;
      }
    }
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const overdueCount = tasks.filter((t) => {
    const today = new Date().toISOString().split('T')[0];
    return t.due_date && t.due_date < today && t.status !== 'done';
  }).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0F6E56]/10 flex items-center justify-center">
            <ListChecks className="w-5 h-5 text-[#0F6E56]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">My Tasks</h1>
            <p className="text-xs text-muted-foreground">
              {todoCount} to do · {inProgressCount} in progress
              {overdueCount > 0 && (
                <span className="text-red-600 font-medium"> · {overdueCount} overdue</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="assigned_to_me" className="text-xs h-7 px-3">Assigned to Me</TabsTrigger>
            <TabsTrigger value="assigned_by_me" className="text-xs h-7 px-3">Assigned by Me</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="pl-8 h-8 w-48 text-xs"
            />
          </div>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter((v ?? 'all') as PriorityFilter)}>
            <SelectTrigger size="sm" className="h-8 w-[120px] text-xs gap-1">
              <SlidersHorizontal className="w-3 h-3" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-3 space-y-2 min-h-[520px]">
              <Skeleton className="h-8 w-full rounded-lg" />
              {Array.from({ length: 3 }).map((__, j) => (
                <Skeleton key={j} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard
          tasks={filtered}
          onStatusChange={handleStatusChange}
          onTaskClick={handleTaskClick}
          showPolicyName
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
    </div>
  );
}
