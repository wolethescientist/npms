'use client';

import { useMemo, useState } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
  rectIntersection,
} from '@dnd-kit/core';
import type { DraggableAttributes } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskWithRelations, TaskStatus, TaskPriority } from '@/lib/types/database.types';

// ─── Config ───────────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; headerBg: string; badgeCls: string }[] = [
  { id: 'todo',        label: 'To Do',       headerBg: 'bg-slate-100 dark:bg-slate-800',    badgeCls: 'bg-slate-200 text-slate-700' },
  { id: 'in_progress', label: 'In Progress',  headerBg: 'bg-blue-50 dark:bg-blue-950',       badgeCls: 'bg-blue-100 text-blue-700' },
  { id: 'in_review',   label: 'In Review',    headerBg: 'bg-amber-50 dark:bg-amber-950',     badgeCls: 'bg-amber-100 text-amber-700' },
  { id: 'done',        label: 'Done',         headerBg: 'bg-emerald-50 dark:bg-emerald-950', badgeCls: 'bg-emerald-100 text-emerald-700' },
];

export const PRIORITY_CFG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: 'text-red-700',    bg: 'bg-red-100'    },
  high:     { label: 'High',     color: 'text-orange-700', bg: 'bg-orange-100' },
  medium:   { label: 'Medium',   color: 'text-amber-700',  bg: 'bg-amber-100'  },
  low:      { label: 'Low',      color: 'text-green-700',  bg: 'bg-green-100'  },
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  tasks: TaskWithRelations[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick: (task: TaskWithRelations) => void;
  showPolicyName?: boolean;
}

// ─── Board ────────────────────────────────────────────────────────────────────

export default function KanbanBoard({
  tasks,
  onStatusChange,
  onTaskClick,
  showPolicyName = true,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const tasksByStatus = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.id, [] as TaskWithRelations[]]));
    tasks.forEach((t) => {
      if (t.status !== 'cancelled' && map[t.status]) {
        map[t.status]!.push(t);
      }
    });
    return map as Record<TaskStatus, TaskWithRelations[]>;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === active.id);
    if (task && task.status !== newStatus && COLUMNS.some((c) => c.id === newStatus)) {
      onStatusChange(task.id, newStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 min-h-[520px]">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasksByStatus[col.id] ?? []}
            activeId={activeId}
            onTaskClick={onTaskClick}
            showPolicyName={showPolicyName}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <TaskCard
            task={activeTask}
            isOverlay
            showPolicyName={showPolicyName}
            onTaskClick={() => {}}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  tasks,
  activeId,
  onTaskClick,
  showPolicyName,
}: {
  column: typeof COLUMNS[0];
  tasks: TaskWithRelations[];
  activeId: string | null;
  onTaskClick: (t: TaskWithRelations) => void;
  showPolicyName: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className={cn('rounded-xl border border-border flex flex-col min-h-[520px] transition-shadow', isOver && 'ring-2 ring-[#0F6E56] ring-offset-1 shadow-lg')}>
      {/* Column header */}
      <div className={cn('rounded-t-xl px-3 py-2.5 flex items-center justify-between', column.headerBg)}>
        <p className="text-xs font-semibold text-foreground">{column.label}</p>
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', column.badgeCls)}>
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2">
        {tasks.map((task) => (
          <DraggableCard
            key={task.id}
            task={task}
            isActive={task.id === activeId}
            onTaskClick={onTaskClick}
            showPolicyName={showPolicyName}
          />
        ))}
        {tasks.length === 0 && (
          <div className="h-20 rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center">
            <p className="text-[10px] text-muted-foreground/40">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Draggable wrapper ────────────────────────────────────────────────────────

function DraggableCard({
  task,
  isActive,
  onTaskClick,
  showPolicyName,
}: {
  task: TaskWithRelations;
  isActive: boolean;
  onTaskClick: (t: TaskWithRelations) => void;
  showPolicyName: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id });

  return (
    <div ref={setNodeRef} className={cn('transition-opacity', isActive && 'opacity-30')}>
      <TaskCard
        task={task}
        dragProps={{ attributes, listeners }}
        onTaskClick={onTaskClick}
        showPolicyName={showPolicyName}
      />
    </div>
  );
}

// ─── Task card (used in column + drag overlay) ────────────────────────────────

export function TaskCard({
  task,
  dragProps,
  onTaskClick,
  showPolicyName,
  isOverlay = false,
}: {
  task: TaskWithRelations;
  dragProps?: { attributes: DraggableAttributes; listeners: ReturnType<typeof useDraggable>['listeners'] };
  onTaskClick: (t: TaskWithRelations) => void;
  showPolicyName: boolean;
  isOverlay?: boolean;
}) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue =
    task.due_date && task.due_date < today && task.status !== 'done' && task.status !== 'cancelled';
  const pCfg = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.medium;

  function getInitials(name?: string) {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card shadow-sm transition-shadow',
        isOverlay ? 'shadow-xl rotate-1 opacity-95 cursor-grabbing' : 'hover:shadow-md cursor-pointer'
      )}
      onClick={() => !isOverlay && onTaskClick(task)}
    >
      <div className="p-3 space-y-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-1">
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', pCfg.bg, pCfg.color)}>
            {pCfg.label}
          </span>
          {dragProps && (
            <button
              {...dragProps.attributes}
              {...dragProps.listeners}
              onClick={(e) => e.stopPropagation()}
              className="touch-none cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground"
              tabIndex={-1}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Title */}
        <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{task.title}</p>

        {/* Policy name */}
        {showPolicyName && task.policy_title && (
          <p className="text-[10px] text-muted-foreground truncate">{task.policy_title}</p>
        )}

        {/* Footer: due date + assignee */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {task.due_date ? (
            <span className={cn('flex items-center gap-1 text-[10px]', isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
              {isOverdue && <AlertCircle className="w-2.5 h-2.5" />}
              <Calendar className="w-2.5 h-2.5" />
              {new Date(task.due_date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
            </span>
          ) : (
            <span />
          )}
          {task.assignee_name && (
            <div className="w-5 h-5 rounded-full bg-[#0F6E56]/15 text-[#0F6E56] text-[9px] font-bold flex items-center justify-center shrink-0" title={task.assignee_name}>
              {getInitials(task.assignee_name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
