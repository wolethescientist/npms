'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { createTask } from '@/lib/actions/tasks';
import { createClient } from '@/lib/supabase/client';
import { profiles as mockProfiles } from '@/lib/mock-data';
import type { TaskPriority, Profile } from '@/lib/types/database.types';
import { PRIORITY_CFG } from './KanbanBoard';

interface Milestone { id: string; title: string; }

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  currentUser: Profile | null;
  onTaskCreated: () => void;
}

export default function AddTaskDialog({
  open,
  onOpenChange,
  policyId,
  currentUser,
  onTaskCreated,
}: AddTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setPriority('medium');
    setDueDate('');
    setMilestoneId('');
    loadData();
  }, [open, policyId]);

  async function loadData() {
    // Load team members — mock first, then Supabase
    const supabase = createClient();
    const { data: dbProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, mda_id, avatar_url, created_at')
      .order('full_name');

    const allProfiles: Profile[] = dbProfiles && dbProfiles.length > 0
      ? dbProfiles
      : mockProfiles;
    setTeamMembers(allProfiles);

    // Load milestones for this policy
    const { data: ms } = await supabase
      .from('policy_milestones')
      .select('id, title')
      .eq('policy_id', policyId)
      .order('due_date');
    setMilestones(ms ?? []);
  }

  async function handleSubmit() {
    if (!title.trim() || !currentUser) return;
    setSaving(true);
    const result = await createTask({
      policy_id: policyId,
      milestone_id: milestoneId || null,
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: assignedTo || null,
      assigned_by: currentUser.id,
      priority,
      due_date: dueDate || null,
    });
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success('Task created');
    onTaskCreated();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Title <span className="text-red-500">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description…"
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority((v ?? 'medium') as TaskPriority)}>
                <SelectTrigger size="sm" className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_CFG[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Assign to</Label>
            <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v ?? '')}>
              <SelectTrigger size="sm" className="w-full text-xs">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {teamMembers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {milestones.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Milestone (optional)</Label>
              <Select value={milestoneId} onValueChange={(v) => setMilestoneId(v ?? '')}>
                <SelectTrigger size="sm" className="w-full text-xs">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {milestones.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="bg-[#0F6E56] hover:bg-[#085041]"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
