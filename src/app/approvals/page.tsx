'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { approveStep, rejectStep, canActionStep } from '@/lib/actions/workflow';
import type { Profile } from '@/lib/types/database.types';
import type { StepRoleRequired } from '@/lib/types/database.types';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
  CheckSquare,
  Building2,
  User,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';

interface PendingStep {
  id: string;
  policy_id: string;
  step_order: number;
  step_label: string | null;
  role_required: string | null;
  version: number;
  policy_title: string;
  policy_mda: string;
  policy_owner: string;
  policy_status: string;
}

const STEP_ROLE_LABELS: Record<string, string> = {
  reviewer:      'Reviewer',
  director:      'Director Approval',
  final_approver:'Final Approver',
};

export default function ApprovalsPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [pendingSteps, setPendingSteps] = useState<PendingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('demo_user');
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  const fetchPendingSteps = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: steps, error } = await supabase
      .from('workflow_steps')
      .select('id, policy_id, step_order, step_label, role_required, version')
      .eq('status', 'pending')
      .eq('is_current', true)
      .order('policy_id');

    if (error) {
      toast.error('Failed to load pending approvals.');
      setLoading(false);
      return;
    }

    if (!steps || steps.length === 0) {
      setPendingSteps([]);
      setLoading(false);
      return;
    }

    // Fetch policy details for each step
    const policyIds = [...new Set(steps.map((s) => s.policy_id))];
    const { data: policies } = await supabase
      .from('policies')
      .select('id, title, mda_id, owner_id, status')
      .in('id', policyIds);

    // Fetch MDA names and profile names from Supabase
    const mdaIds = [...new Set((policies ?? []).map((p) => p.mda_id))];
    const ownerIds = [...new Set((policies ?? []).map((p) => p.owner_id))];

    const [{ data: mdas }, { data: owners }] = await Promise.all([
      supabase.from('mdas').select('id, code').in('id', mdaIds),
      supabase.from('profiles').select('id, full_name').in('id', ownerIds),
    ]);

    const mdaMap = Object.fromEntries((mdas ?? []).map((m) => [m.id, m.code]));
    const ownerMap = Object.fromEntries((owners ?? []).map((o) => [o.id, o.full_name]));
    const policyMap = Object.fromEntries((policies ?? []).map((p) => [p.id, p]));

    const enriched: PendingStep[] = steps.map((step) => {
      const pol = policyMap[step.policy_id];
      return {
        ...step,
        policy_title:  pol?.title ?? 'Untitled Policy',
        policy_mda:    mdaMap[pol?.mda_id] ?? 'N/A',
        policy_owner:  ownerMap[pol?.owner_id] ?? 'Unknown',
        policy_status: pol?.status ?? 'in_review',
      };
    });

    setPendingSteps(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPendingSteps();
  }, [fetchPendingSteps]);

  const handleApprove = async (step: PendingStep) => {
    if (!currentUser) return;
    setActioningId(step.id);
    const { error } = await approveStep(step.id, step.policy_id, currentUser.id, currentUser.role);
    setActioningId(null);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Step approved.');
      await fetchPendingSteps();
    }
  };

  const handleReject = async (step: PendingStep) => {
    if (!currentUser || !rejectComment.trim()) {
      toast.error('A rejection reason is required.');
      return;
    }
    setActioningId(step.id);
    const { error } = await rejectStep(step.id, step.policy_id, currentUser.id, currentUser.role, rejectComment.trim());
    setActioningId(null);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Policy rejected and returned to the officer.');
      setRejectComment('');
      await fetchPendingSteps();
    }
  };

  const mySteps = currentUser
    ? pendingSteps.filter((s) => canActionStep(currentUser.role, s.role_required as StepRoleRequired))
    : [];

  const otherSteps = currentUser
    ? pendingSteps.filter((s) => !canActionStep(currentUser.role, s.role_required as StepRoleRequired))
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Review and action policies awaiting your approval
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F6E56]" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Steps requiring my action */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="w-4 h-4 text-[#0F6E56]" />
              <h2 className="text-sm font-semibold text-foreground">Requires Your Action</h2>
              {mySteps.length > 0 && (
                <Badge className="bg-[#0F6E56] text-white text-[10px] px-1.5">{mySteps.length}</Badge>
              )}
            </div>

            {mySteps.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">You're all caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No policies are waiting for your review right now.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {mySteps.map((step) => (
                  <ApprovalCard
                    key={step.id}
                    step={step}
                    isActioning={actioningId === step.id}
                    rejectComment={rejectComment}
                    onRejectCommentChange={setRejectComment}
                    onApprove={() => handleApprove(step)}
                    onReject={() => handleReject(step)}
                    showActions
                  />
                ))}
              </div>
            )}
          </section>

          {/* Other pending steps (visible to super_admin for oversight) */}
          {otherSteps.length > 0 && currentUser?.role === 'super_admin' && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">All Pending (System Overview)</h2>
                <Badge variant="outline" className="text-[10px] px-1.5">{otherSteps.length}</Badge>
              </div>
              <div className="space-y-3">
                {otherSteps.map((step) => (
                  <ApprovalCard
                    key={step.id}
                    step={step}
                    isActioning={false}
                    rejectComment=""
                    onRejectCommentChange={() => {}}
                    onApprove={() => {}}
                    onReject={() => {}}
                    showActions={false}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  step,
  isActioning,
  rejectComment,
  onRejectCommentChange,
  onApprove,
  onReject,
  showActions,
}: {
  step: PendingStep;
  isActioning: boolean;
  rejectComment: string;
  onRejectCommentChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  showActions: boolean;
}) {
  return (
    <Card className={showActions ? 'border-[#0F6E56]/30 shadow-sm' : ''}>
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{step.policy_title}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{step.policy_mda}</span>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{step.policy_owner}</span>
                  <span>v{step.version}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                  Step {step.step_order} — {STEP_ROLE_LABELS[step.role_required ?? ''] ?? step.role_required}
                </Badge>
              </div>
            </div>

            {showActions && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <Button
                  size="sm"
                  className="h-8 text-xs bg-[#0F6E56] hover:bg-[#085041]"
                  onClick={onApprove}
                  disabled={isActioning}
                >
                  {isActioning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                  Approve
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger
                    render={<Button size="sm" variant="outline" className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50" disabled={isActioning} />}
                  >
                    <XCircle className="w-3 h-3 mr-1" /> Reject
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject this policy</AlertDialogTitle>
                      <AlertDialogDescription>
                        The policy will be returned to the officer for revision. You must provide a reason.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                      placeholder="Explain why this policy is being rejected..."
                      value={rejectComment}
                      onChange={(e) => onRejectCommentChange(e.target.value)}
                      rows={4}
                      className="mt-2"
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => onRejectCommentChange('')}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={onReject}
                        disabled={!rejectComment.trim()}
                      >
                        Confirm Rejection
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Link href={`/policies/${step.policy_id}`} className="ml-auto">
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground">
                    View Policy <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            )}

            {!showActions && (
              <Link href={`/policies/${step.policy_id}`} className="inline-flex items-center gap-1 text-xs text-[#0F6E56] hover:underline mt-2">
                View Policy <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
