'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { toast } from 'sonner';
import {
  getIndicatorsWithReadings,
  getAuditLogsWithActors,
  getMDA,
  getProfile,
  policies as mockPolicies,
} from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';
import { submitForReview, publishPolicy } from '@/lib/actions/workflow';
import { StatusBadge } from '@/components/shared/status-badge';
import WorkflowTimeline from '@/components/policy/WorkflowTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  ArrowLeft, FileText, GitBranch, BarChart3, History,
  Send, Globe, Loader2, Calendar, Building2, User, ListChecks,
} from 'lucide-react';
import { formatDate, formatDateTime, getTrafficLightColor } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Policy, Profile } from '@/lib/types/database.types';

// Maps step order to label for the progress bar
const STEP_LABELS: Record<number, string> = {
  1: 'Initial Review',
  2: 'Director Approval',
  3: 'Final Approval',
};

function WorkflowProgressBar({ policyId, status }: { policyId: string; status: string }) {
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'in_review') return;
    const supabase = createClient();
    supabase
      .from('workflow_steps')
      .select('step_order')
      .eq('policy_id', policyId)
      .eq('is_current', true)
      .order('version', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setCurrentStep(data.step_order);
      });
  }, [policyId, status]);

  if (status !== 'in_review' || currentStep === null) return null;

  return (
    <div className="rounded-xl border border-[#0F6E56]/20 bg-[#0F6E56]/5 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#0F6E56]">
          Step {currentStep} of 3 — Awaiting {STEP_LABELS[currentStep]}
        </p>
        <span className="text-xs text-muted-foreground">{Math.round((currentStep - 1) / 3 * 100)}% complete</span>
      </div>
      <Progress value={((currentStep - 1) / 3) * 100} className="h-1.5 bg-[#0F6E56]/20" />
    </div>
  );
}

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') ?? 'document';

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [workflowKey, setWorkflowKey] = useState(0); // force WorkflowTimeline re-fetch

  // Load current user
  useEffect(() => {
    const stored = localStorage.getItem('demo_user');
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  // Load policy — mock-data first, then Supabase
  const loadPolicy = useCallback(async () => {
    // Try mock data
    const mock = mockPolicies.find((p) => p.id === id);
    if (mock) {
      setPolicy(mock);
      setLoading(false);
      return;
    }
    // Fetch from Supabase
    const supabase = createClient();
    const { data, error } = await supabase.from('policies').select('*').eq('id', id).single();
    if (error || !data) {
      setLoading(false);
      return;
    }
    setPolicy(data as Policy);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadPolicy(); }, [loadPolicy]);

  const handleSubmitForReview = async () => {
    if (!currentUser || !policy) return;
    setSubmitting(true);
    const { error } = await submitForReview(policy.id, currentUser.id);
    setSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Policy submitted for review. The approval workflow has started.');
      await loadPolicy();
      setWorkflowKey((k) => k + 1);
    }
  };

  const handlePublish = async () => {
    if (!currentUser || !policy) return;
    setPublishing(true);
    const { error } = await publishPolicy(policy.id, currentUser.id, currentUser.role);
    setPublishing(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Policy published successfully.');
      await loadPolicy();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[#0F6E56]" />
      </div>
    );
  }

  if (!policy) { notFound(); }

  const meData = getIndicatorsWithReadings(id);
  const auditLogs = getAuditLogsWithActors(id);
  const mda = getMDA(policy.mda_id);
  const owner = getProfile(policy.owner_id);

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Created policy', updated: 'Updated policy', published: 'Published policy',
      submitted_for_review: 'Submitted for review', approved: 'Approved step',
      rejected: 'Rejected step', reading_submitted: 'Submitted M&E reading',
    };
    return labels[action] || action;
  };

  const canSubmit = policy.status === 'draft' || policy.status === 'rejected';
  const canPublish = policy.status === 'approved' &&
    currentUser && ['mda_admin', 'super_admin'].includes(currentUser.role);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/policies"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Policies</Link>
        </Button>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{policy.title}</h1>
              <StatusBadge status={policy.status} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {mda?.name ?? 'N/A'}</span>
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {owner?.full_name ?? 'Unknown'}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Updated {formatDate(policy.updated_at)}</span>
              <Badge variant="secondary" className="text-xs">v{policy.version}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/policies/${id}/tasks`}>
                <ListChecks className="w-4 h-4 mr-2" />
                Tasks
              </Link>
            </Button>
            {canSubmit && (
              <Button
                className="bg-[#0F6E56] hover:bg-[#085041]"
                onClick={handleSubmitForReview}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {policy.status === 'rejected' ? 'Resubmit for Review' : 'Submit for Review'}
              </Button>
            )}
            {canPublish && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Workflow progress bar */}
      <WorkflowProgressBar policyId={id} status={policy.status} />

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="document" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> Document</TabsTrigger>
          <TabsTrigger value="workflow" className="gap-1.5 text-xs"><GitBranch className="w-3.5 h-3.5" /> Workflow</TabsTrigger>
          <TabsTrigger value="me" className="gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" /> M&E</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs"><History className="w-3.5 h-3.5" /> Audit Log</TabsTrigger>
        </TabsList>

        {/* Document Tab */}
        <TabsContent value="document">
          <Card>
            <CardContent className="pt-6">
              <div
                className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80"
                dangerouslySetInnerHTML={{ __html: policy.body || '<p class="text-muted-foreground italic">No content yet.</p>' }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Tab */}
        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Approval Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              {currentUser ? (
                <WorkflowTimeline
                  key={workflowKey}
                  policyId={id}
                  currentUser={currentUser}
                  onStatusChange={() => { loadPolicy(); setWorkflowKey((k) => k + 1); }}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* M&E Tab */}
        <TabsContent value="me">
          {meData.length === 0 ? (
            <Card><CardContent className="py-12"><p className="text-sm text-muted-foreground text-center">No indicators configured for this policy yet.</p></CardContent></Card>
          ) : (
            <div className="grid gap-5">
              {meData.map((indicator) => {
                const latest = indicator.indicator_readings[indicator.indicator_readings.length - 1];
                const traffic = getTrafficLightColor(latest?.value ?? indicator.baseline, indicator.target);
                const trafficColors: Record<string, string> = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', gray: 'bg-gray-400' };
                const pct = indicator.target > 0 ? Math.round(((latest?.value ?? indicator.baseline) / indicator.target) * 100) : 0;
                return (
                  <Card key={indicator.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${trafficColors[traffic.color]}`} />
                          <CardTitle className="text-sm font-semibold">{indicator.name}</CardTitle>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{pct}%</p>
                          <p className="text-[10px] text-muted-foreground">{traffic.label}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>Baseline: {indicator.baseline} {indicator.unit}</span>
                        <span>Target: {indicator.target} {indicator.unit}</span>
                        <span className="capitalize">{indicator.frequency} tracking</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {indicator.indicator_readings.length > 0 ? (
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={indicator.indicator_readings}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e5e7eb' }} />
                              <ReferenceLine y={indicator.target} stroke="#0F6E56" strokeDasharray="8 4" label={{ value: 'Target', fill: '#0F6E56', fontSize: 11 }} />
                              <Line type="monotone" dataKey="value" stroke="#0F6E56" strokeWidth={2} dot={{ fill: '#0F6E56', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No readings yet</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Activity History</CardTitle></CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary mt-0.5">
                        {log.actor?.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{log.actor?.full_name}</span>{' '}
                          {getActionLabel(log.action)}
                        </p>
                        {log.diff && Object.keys(log.diff).length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                            {Object.entries(log.diff).map(([key, value]) => (
                              <div key={key}><span className="font-medium">{key}:</span>{' '}{typeof value === 'string' ? (value.length > 60 ? value.slice(0, 60) + '…' : value) : JSON.stringify(value)}</div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
