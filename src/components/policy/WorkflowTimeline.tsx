'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { approveStep, rejectStep, canActionStep } from '@/lib/actions/workflow';
import type { Profile } from '@/lib/types/database.types';
import type { StepRoleRequired } from '@/lib/types/database.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { getProfile } from '@/lib/mock-data';

interface WorkflowStep {
  id: string;
  policy_id: string;
  step_order: number;
  step_label: string | null;
  role_required: string | null;
  status: string;
  is_current: boolean;
  version: number;
  approver_id: string | null;
  comment: string | null;
  actioned_at: string | null;
}

interface WorkflowTimelineProps {
  policyId: string;
  currentUser: Profile;
  onStatusChange?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  reviewer:      'Reviewer',
  director:      'Director',
  final_approver:'Final Approver',
};

function StepIcon({ status, isCurrent }: { status: string; isCurrent: boolean }) {
  if (status === 'approved') return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
  if (status === 'rejected') return <XCircle className="w-6 h-6 text-red-600" />;
  if (isCurrent) return <Clock className="w-6 h-6 text-amber-500" />;
  return <Clock className="w-6 h-6 text-gray-300" />;
}

function stepStatusColor(status: string, isCurrent: boolean): string {
  if (status === 'approved') return 'border-emerald-200 bg-emerald-50';
  if (status === 'rejected') return 'border-red-200 bg-red-50';
  if (isCurrent) return 'border-[#0F6E56] bg-[#0F6E56]/5 animate-pulse-border';
  return 'border-border bg-background';
}

export default function WorkflowTimeline({ policyId, currentUser, onStatusChange }: WorkflowTimelineProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [versions, setVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioningStepId, setActioningStepId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const fetchSteps = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('policy_id', policyId)
      .order('version', { ascending: false })
      .order('step_order', { ascending: true });

    if (error) {
      toast.error('Failed to load workflow steps.');
      setLoading(false);
      return;
    }

    const allSteps = (data ?? []) as WorkflowStep[];
    const uniqueVersions = [...new Set(allSteps.map((s) => s.version))].sort((a, b) => b - a);

    setVersions(uniqueVersions);
    setSteps(allSteps);

    if (selectedVersion === null && uniqueVersions.length > 0) {
      setSelectedVersion(uniqueVersions[0]);
    }
    setLoading(false);
  }, [policyId, selectedVersion]);

  useEffect(() => { fetchSteps(); }, [fetchSteps]);

  const visibleSteps = steps.filter((s) => s.version === (selectedVersion ?? versions[0]));

  const handleApprove = async (step: WorkflowStep) => {
    setActioningStepId(step.id);
    const { error } = await approveStep(step.id, policyId, currentUser.id, currentUser.role);
    setActioningStepId(null);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Step approved successfully.');
      await fetchSteps();
      onStatusChange?.();
    }
  };

  const handleReject = async (step: WorkflowStep) => {
    if (!rejectComment.trim()) {
      toast.error('A comment is required when rejecting.');
      return;
    }
    setActioningStepId(step.id);
    const { error } = await rejectStep(step.id, policyId, currentUser.id, currentUser.role, rejectComment.trim());
    setActioningStepId(null);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Policy rejected. The policy officer will be notified.');
      setRejectComment('');
      await fetchSteps();
      onStatusChange?.();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#0F6E56]" />
      </div>
    );
  }

  if (visibleSteps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No workflow steps yet. Submit this policy for review to initiate the approval process.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Version selector */}
      {versions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Viewing version:</span>
          <Select
            value={String(selectedVersion)}
            onValueChange={(v) => setSelectedVersion(Number(v))}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v} value={String(v)}>
                  Version {v}{v === versions[0] ? ' (latest)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stepper */}
      <div className="relative">
        <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-border" />
        <div className="space-y-4">
          {visibleSteps.map((step) => {
            const approver = step.approver_id ? getProfile(step.approver_id) : null;
            const canAction =
              step.is_current &&
              step.status === 'pending' &&
              canActionStep(currentUser.role, step.role_required as StepRoleRequired);
            const isActioning = actioningStepId === step.id;

            return (
              <div key={step.id} className="relative flex gap-4">
                {/* Icon */}
                <div className="relative z-10 w-[56px] flex flex-col items-center">
                  <div className={`w-[56px] h-[56px] rounded-full border-2 flex items-center justify-center bg-background ${
                    step.is_current && step.status === 'pending'
                      ? 'border-[#0F6E56] shadow-[0_0_0_4px_rgba(15,110,86,0.15)]'
                      : step.status === 'approved'
                      ? 'border-emerald-300'
                      : step.status === 'rejected'
                      ? 'border-red-300'
                      : 'border-border'
                  }`}>
                    <StepIcon status={step.status} isCurrent={step.is_current} />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 font-medium">
                    Step {step.step_order}
                  </span>
                </div>

                {/* Card */}
                <div className={`flex-1 border rounded-xl p-4 mb-2 transition-all ${stepStatusColor(step.status, step.is_current)}`}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{step.step_label ?? `Step ${step.step_order}`}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[step.role_required ?? ''] ?? step.role_required}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        step.status === 'approved' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                        step.status === 'rejected' ? 'border-red-300 text-red-700 bg-red-50' :
                        step.is_current ? 'border-amber-300 text-amber-700 bg-amber-50' :
                        'border-border text-muted-foreground'
                      }`}
                    >
                      {step.status === 'pending' && step.is_current ? 'Awaiting Action' :
                       step.status === 'pending' ? 'Pending' :
                       step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                    </Badge>
                  </div>

                  {approver && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                      <span className="font-medium text-foreground">{approver.full_name}</span>
                      {step.actioned_at && (
                        <> · {new Date(step.actioned_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                      )}
                    </p>
                  )}

                  {/* Rejection comment callout */}
                  {step.status === 'rejected' && step.comment && (
                    <div className="mt-2 flex gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-700 italic">&ldquo;{step.comment}&rdquo;</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {canAction && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-[#0F6E56]/20">
                      <Button
                        size="sm"
                        className="bg-[#0F6E56] hover:bg-[#085041] h-8 text-xs"
                        onClick={() => handleApprove(step)}
                        disabled={isActioning}
                      >
                        {isActioning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                        Approve
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                              disabled={isActioning}
                            />
                          }
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject this step</AlertDialogTitle>
                            <AlertDialogDescription>
                              Rejecting will return the policy to the officer for revision. You must provide a reason.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <Textarea
                            placeholder="Explain why this policy is being rejected..."
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            rows={4}
                            className="mt-2"
                          />
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setRejectComment('')}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleReject(step)}
                              disabled={!rejectComment.trim()}
                            >
                              Confirm Rejection
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
