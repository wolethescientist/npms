'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, BarChart3, CheckSquare, MessageSquare, FileText,
  Loader2, CheckCircle2, Clock, AlertTriangle, XCircle,
  Plus, Printer, TrendingUp, Building2, Calendar, User,
} from 'lucide-react';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import type { Profile } from '@/lib/types/database.types';
import type { PolicyMilestone, MilestoneStatus } from '@/lib/types/database.types';
import { mdas as mockMdas, policies as mockPolicies, profiles as mockProfiles } from '@/lib/mock-data';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PolicyInfo {
  id: string;
  title: string;
  status: string;
  mda_id: string;
  owner_id: string;
  updated_at: string;
  sector: string | null;
  version: number;
}

interface IndicatorWithReadings {
  id: string;
  name: string;
  baseline: number;
  target: number;
  unit: string;
  frequency: string;
  readings: { id: string; value: number; period: string; notes: string | null; created_at: string }[];
  latest_value: number | null;
  score: number | null;
}

interface UpdateEntry {
  id: string;
  content: string;
  submitted_by: string;
  author_name: string;
  milestone_id: string | null;
  created_at: string;
}

type PolicyHealthStatus = 'on_track' | 'at_risk' | 'off_track' | 'no_data';

function computeHealth(score: number | null): PolicyHealthStatus {
  if (score === null) return 'no_data';
  if (score >= 90) return 'on_track';
  if (score >= 60) return 'at_risk';
  return 'off_track';
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const LINE_COLORS = ['#0F6E56', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const MILESTONE_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:     { label: 'Pending',     color: 'text-gray-600',    bg: 'bg-gray-100',    icon: Clock       },
  in_progress: { label: 'In Progress', color: 'text-amber-700',   bg: 'bg-amber-50',    icon: AlertTriangle },
  completed:   { label: 'Completed',   color: 'text-emerald-700', bg: 'bg-emerald-50',  icon: CheckCircle2  },
  overdue:     { label: 'Overdue',     color: 'text-red-700',     bg: 'bg-red-50',      icon: XCircle       },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonitoringDetailPage({ params }: { params: Promise<{ policyId: string }> }) {
  const { policyId } = use(params);

  const [policy, setPolicy] = useState<PolicyInfo | null>(null);
  const [indicators, setIndicators] = useState<IndicatorWithReadings[]>([]);
  const [milestones, setMilestones] = useState<PolicyMilestone[]>([]);
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  // Submit reading state
  const [selectedIndicatorId, setSelectedIndicatorId] = useState('');
  const [readingValue, setReadingValue] = useState('');
  const [readingPeriod, setReadingPeriod] = useState('');
  const [readingNotes, setReadingNotes] = useState('');
  const [submittingReading, setSubmittingReading] = useState(false);

  // Add milestone dialog
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msDueDate, setMsDueDate] = useState('');
  const [msStatus, setMsStatus] = useState<MilestoneStatus>('pending');
  const [savingMilestone, setSavingMilestone] = useState(false);

  // Post update state
  const [updateContent, setUpdateContent] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);

  // Completing milestone
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('demo_user');
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Load policy
    let pol: PolicyInfo | null = null;
    const mock = mockPolicies.find((p) => p.id === policyId);
    if (mock) {
      pol = { ...mock, sector: null };
    } else {
      const { data } = await supabase
        .from('policies')
        .select('id, title, status, mda_id, owner_id, updated_at, sector, version')
        .eq('id', policyId)
        .single();
      pol = data ?? null;
    }
    setPolicy(pol);

    // Load indicators with readings
    const { data: rawIndicators } = await supabase
      .from('indicators')
      .select('id, name, baseline, target, unit, frequency')
      .eq('policy_id', policyId);

    const indicatorIds = (rawIndicators ?? []).map((i) => i.id);
    const { data: readings } = indicatorIds.length > 0
      ? await supabase
          .from('indicator_readings')
          .select('id, indicator_id, value, period, notes, created_at')
          .in('indicator_id', indicatorIds)
          .order('created_at', { ascending: true })
      : { data: [] as { id: string; indicator_id: string; value: number; period: string; notes: string | null; created_at: string }[] };

    const readingsByInd: Record<string, typeof readings> = {};
    (readings ?? []).forEach((r) => {
      if (!readingsByInd[r.indicator_id]) readingsByInd[r.indicator_id] = [];
      readingsByInd[r.indicator_id]!.push(r);
    });

    const enrichedIndicators: IndicatorWithReadings[] = (rawIndicators ?? []).map((ind) => {
      const indReadings = readingsByInd[ind.id] ?? [];
      const latest = indReadings[indReadings.length - 1];
      const latestValue = latest?.value ?? null;
      const score =
        latestValue !== null && ind.target > 0
          ? (latestValue / ind.target) * 100
          : null;
      return { ...ind, readings: indReadings, latest_value: latestValue, score };
    });
    setIndicators(enrichedIndicators);

    // Load milestones
    const { data: ms } = await supabase
      .from('policy_milestones')
      .select('*')
      .eq('policy_id', policyId)
      .order('due_date', { ascending: true });
    setMilestones(ms ?? []);

    // Load implementation updates
    const { data: rawUpdates } = await supabase
      .from('implementation_updates')
      .select('id, content, submitted_by, milestone_id, created_at')
      .eq('policy_id', policyId)
      .order('created_at', { ascending: false });

    if (rawUpdates && rawUpdates.length > 0) {
      const authorIds = [...new Set(rawUpdates.map((u) => u.submitted_by))];
      const { data: authors } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', authorIds);
      const authorMap = Object.fromEntries((authors ?? []).map((a) => [a.id, a.full_name]));
      setUpdates(
        rawUpdates.map((u) => ({
          id: u.id,
          content: u.content,
          submitted_by: u.submitted_by,
          author_name: authorMap[u.submitted_by] ?? 'Unknown',
          milestone_id: u.milestone_id,
          created_at: u.created_at,
        }))
      );
    } else {
      setUpdates([]);
    }

    setLoading(false);
  }, [policyId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived health ──
  const scores = indicators.map((i) => i.score).filter((s): s is number => s !== null);
  const overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const healthStatus = computeHealth(overallScore);

  const today = new Date().toISOString().split('T')[0];

  // ── MDA + owner info ──
  const mdaInfo = mockMdas.find((m) => m.id === policy?.mda_id);
  const ownerInfo = mockProfiles.find((p) => p.id === policy?.owner_id);

  // ── Actions ──────────────────────────────────────────────────────────────
  const canSubmitReading =
    currentUser?.role === 'me_officer' || currentUser?.role === 'mda_admin' || currentUser?.role === 'super_admin';
  const canManageMilestones =
    currentUser?.role === 'mda_admin' || currentUser?.role === 'super_admin';
  const canPostUpdate =
    currentUser?.role !== 'reviewer' && currentUser?.role !== 'final_approver';

  const handleSubmitReading = async () => {
    if (!currentUser || !selectedIndicatorId || !readingValue || !readingPeriod) {
      toast.error('Please fill in all required fields.');
      return;
    }
    const val = parseFloat(readingValue);
    if (isNaN(val)) { toast.error('Value must be a number.'); return; }
    setSubmittingReading(true);
    const supabase = createClient();
    const { error } = await supabase.from('indicator_readings').insert({
      indicator_id: selectedIndicatorId,
      value: val,
      period: readingPeriod.trim(),
      notes: readingNotes.trim() || null,
      submitted_by: currentUser.id,
    });
    setSubmittingReading(false);
    if (error) {
      toast.error('Failed to submit reading: ' + error.message);
    } else {
      toast.success('Reading submitted.');
      setSelectedIndicatorId('');
      setReadingValue('');
      setReadingPeriod('');
      setReadingNotes('');
      loadData();
    }
  };

  const handleAddMilestone = async () => {
    if (!currentUser || !msTitle.trim() || !msDueDate) {
      toast.error('Title and due date are required.');
      return;
    }
    setSavingMilestone(true);
    const supabase = createClient();
    const { error } = await supabase.from('policy_milestones').insert({
      policy_id: policyId,
      title: msTitle.trim(),
      description: msDesc.trim() || null,
      due_date: msDueDate,
      status: msStatus,
      owner_id: currentUser.id,
    });
    setSavingMilestone(false);
    if (error) {
      toast.error('Failed to add milestone: ' + error.message);
    } else {
      toast.success('Milestone added.');
      setMilestoneDialogOpen(false);
      setMsTitle(''); setMsDesc(''); setMsDueDate(''); setMsStatus('pending');
      loadData();
    }
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    setCompletingId(milestoneId);
    const supabase = createClient();
    const { error } = await supabase
      .from('policy_milestones')
      .update({ status: 'completed' })
      .eq('id', milestoneId);
    setCompletingId(null);
    if (error) {
      toast.error('Failed to update milestone.');
    } else {
      toast.success('Milestone marked complete.');
      loadData();
    }
  };

  const handlePostUpdate = async () => {
    if (!currentUser || !updateContent.trim()) {
      toast.error('Update content is required.');
      return;
    }
    setPostingUpdate(true);
    const supabase = createClient();
    const { error } = await supabase.from('implementation_updates').insert({
      policy_id: policyId,
      content: updateContent.trim(),
      submitted_by: currentUser.id,
    });
    setPostingUpdate(false);
    if (error) {
      toast.error('Failed to post update: ' + error.message);
    } else {
      toast.success('Update posted.');
      setUpdateContent('');
      loadData();
    }
  };

  // ── Chart data: pivot readings into a single dataset keyed by period ──
  const allPeriods = [...new Set(indicators.flatMap((i) => i.readings.map((r) => r.period)))].sort();
  const chartData = allPeriods.map((period) => {
    const entry: Record<string, string | number> = { period };
    indicators.forEach((ind) => {
      const r = ind.readings.find((rd) => rd.period === period);
      if (r) entry[ind.name] = r.value;
    });
    return entry;
  });

  // ── Summary report content ──
  const generateSummaryText = () => {
    if (!policy) return '';
    const onTrack  = indicators.filter((i) => (i.score ?? 0) >= 90).length;
    const atRisk   = indicators.filter((i) => i.score !== null && i.score >= 60 && i.score < 90).length;
    const offTrack = indicators.filter((i) => i.score !== null && i.score < 60).length;
    const noData   = indicators.filter((i) => i.score === null).length;
    const msDone   = milestones.filter((m) => m.status === 'completed').length;
    const msOverdue = milestones.filter((m) => m.due_date < today && m.status !== 'completed').length;

    return `POLICY MONITORING REPORT
Generated: ${new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}

POLICY: ${policy.title}
MDA: ${mdaInfo?.name ?? 'N/A'} (${mdaInfo?.code ?? ''})
Status: ${policy.status.toUpperCase().replace('_', ' ')}
Version: v${policy.version}
Last Updated: ${new Date(policy.updated_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}

OVERALL HEALTH: ${healthStatus.replace('_', ' ').toUpperCase()}${overallScore !== null ? ` (${overallScore.toFixed(1)}%)` : ''}

KPI SUMMARY (${indicators.length} indicators):
  • On Track (≥90%):  ${onTrack}
  • At Risk (60–89%): ${atRisk}
  • Off Track (<60%): ${offTrack}
  • No Data:          ${noData}

INDICATOR DETAILS:
${indicators.map((ind) => `  ${ind.name}: ${ind.latest_value !== null ? `${ind.latest_value} ${ind.unit}` : 'No reading'} / Target: ${ind.target} ${ind.unit}${ind.score !== null ? ` (${ind.score.toFixed(0)}%)` : ''}`).join('\n')}

MILESTONES: ${msDone}/${milestones.length} completed${msOverdue > 0 ? `, ${msOverdue} overdue` : ''}
${milestones.map((m) => `  [${m.status.toUpperCase()}] ${m.title} — Due: ${new Date(m.due_date).toLocaleDateString('en-NG')}`).join('\n')}

RECENT ACTIVITY: ${updates.length} implementation update(s) recorded.
${updates.slice(0, 3).map((u) => `  • ${u.author_name} (${new Date(u.created_at).toLocaleDateString('en-NG')}): ${u.content.slice(0, 100)}${u.content.length > 100 ? '…' : ''}`).join('\n')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[#0F6E56]" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Policy not found.</p>
        <Link href="/monitoring">
          <Button variant="outline" size="sm" className="mt-4">Back to Monitoring</Button>
        </Link>
      </div>
    );
  }

  const HEALTH_CONFIG = {
    on_track:  { label: 'On Track',  color: 'text-emerald-700', bg: 'bg-emerald-50',  icon: CheckCircle2  },
    at_risk:   { label: 'At Risk',   color: 'text-amber-700',   bg: 'bg-amber-50',    icon: AlertTriangle },
    off_track: { label: 'Off Track', color: 'text-red-700',     bg: 'bg-red-50',      icon: XCircle       },
    no_data:   { label: 'No Data',   color: 'text-gray-500',    bg: 'bg-gray-50',     icon: Clock         },
  };
  const hCfg = HEALTH_CONFIG[healthStatus];
  const HIcon = hCfg.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/monitoring"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Monitoring</Link>
        </Button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{policy.title}</h1>
              <StatusBadge status={policy.status} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {mdaInfo && <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{mdaInfo.name}</span>}
              {ownerInfo && <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{ownerInfo.full_name}</span>}
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Updated {formatDate(policy.updated_at)}</span>
              <Badge variant="secondary" className="text-xs">v{policy.version}</Badge>
            </div>
          </div>

          {/* Health badge */}
          <div className={cn('flex items-center gap-2 px-4 py-2 rounded-xl border', hCfg.bg)}>
            <HIcon className={cn('w-5 h-5', hCfg.color)} />
            <div>
              <p className={cn('text-sm font-bold leading-tight', hCfg.color)}>{hCfg.label}</p>
              <p className="text-[10px] text-muted-foreground">
                {overallScore !== null ? `${overallScore.toFixed(1)}% avg score` : 'No readings yet'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="kpi">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="kpi"      className="gap-1.5 text-xs"><BarChart3    className="w-3.5 h-3.5" /> KPI Tracking</TabsTrigger>
          <TabsTrigger value="milestones" className="gap-1.5 text-xs"><CheckSquare  className="w-3.5 h-3.5" /> Milestones</TabsTrigger>
          <TabsTrigger value="log"      className="gap-1.5 text-xs"><MessageSquare className="w-3.5 h-3.5" /> Implementation Log</TabsTrigger>
          <TabsTrigger value="report"   className="gap-1.5 text-xs"><FileText     className="w-3.5 h-3.5" /> Summary Report</TabsTrigger>
        </TabsList>

        {/* ── KPI Tracking ── */}
        <TabsContent value="kpi" className="space-y-5">
          {/* Indicator list */}
          {indicators.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No indicators configured for this policy.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {indicators.map((ind, idx) => {
                  const hs = computeHealth(ind.score);
                  const scoreCfg = HEALTH_CONFIG[hs];
                  return (
                    <Card key={ind.id} className={cn('border', hs === 'off_track' ? 'border-red-200' : hs === 'at_risk' ? 'border-amber-200' : '')}>
                      <CardContent className="py-4 px-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <p className="text-sm font-semibold text-foreground">{ind.name}</p>
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', scoreCfg.bg, scoreCfg.color)}>
                            {ind.score !== null ? `${ind.score.toFixed(0)}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Baseline</p>
                            <p className="text-sm font-semibold">{ind.baseline} <span className="text-[10px] font-normal text-muted-foreground">{ind.unit}</span></p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Current</p>
                            <p className={cn('text-sm font-semibold', scoreCfg.color)}>
                              {ind.latest_value !== null ? ind.latest_value : '—'} <span className="text-[10px] font-normal text-muted-foreground">{ind.unit}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Target</p>
                            <p className="text-sm font-semibold">{ind.target} <span className="text-[10px] font-normal text-muted-foreground">{ind.unit}</span></p>
                          </div>
                        </div>
                        <Progress
                          value={Math.min(ind.score ?? 0, 100)}
                          className={cn('h-1.5', hs === 'off_track' ? '[&_[data-slot=progress-indicator]]:bg-red-500' : hs === 'at_risk' ? '[&_[data-slot=progress-indicator]]:bg-amber-500' : '')}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
                          <span>{ind.frequency} tracking</span>
                          <span>{ind.readings.length} readings</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Combined chart */}
              {chartData.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Historical Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e5e7eb' }} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          {indicators.map((ind, i) => (
                            <Line
                              key={ind.id}
                              type="monotone"
                              dataKey={ind.name}
                              stroke={LINE_COLORS[i % LINE_COLORS.length]}
                              strokeWidth={2}
                              dot={{ fill: LINE_COLORS[i % LINE_COLORS.length], r: 3 }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submit Reading */}
              {canSubmitReading && (
                <Card className="border-[#0F6E56]/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-[#0F6E56]">Submit New Reading</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs mb-1.5">Indicator <span className="text-red-500">*</span></Label>
                        <Select value={selectedIndicatorId} onValueChange={(v) => setSelectedIndicatorId(v ?? '')}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select indicator" />
                          </SelectTrigger>
                          <SelectContent>
                            {indicators.map((ind) => (
                              <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5">Value <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          placeholder="e.g. 75"
                          value={readingValue}
                          onChange={(e) => setReadingValue(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5">Period <span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="e.g. Q1 2025 or Jan 2025"
                          value={readingPeriod}
                          onChange={(e) => setReadingPeriod(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5">Notes</Label>
                        <Input
                          placeholder="Optional notes"
                          value={readingNotes}
                          onChange={(e) => setReadingNotes(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className="bg-[#0F6E56] hover:bg-[#085041]"
                        onClick={handleSubmitReading}
                        disabled={submittingReading}
                      >
                        {submittingReading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <TrendingUp className="w-3 h-3 mr-1" />}
                        Submit Reading
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Milestones ── */}
        <TabsContent value="milestones">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {milestones.filter((m) => m.status === 'completed').length}/{milestones.length} milestones completed
            </p>
            {canManageMilestones && (
              <Button
                size="sm"
                className="bg-[#0F6E56] hover:bg-[#085041] gap-1.5"
                onClick={() => setMilestoneDialogOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </Button>
            )}
          </div>

          {milestones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No milestones yet.</p>
                {canManageMilestones && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setMilestoneDialogOpen(true)}>
                    Add the first milestone
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-5 bottom-5 w-0.5 bg-border" />
              <div className="space-y-4">
                {milestones.map((ms) => {
                  const cfg = MILESTONE_STATUS_CFG[ms.status] ?? MILESTONE_STATUS_CFG.pending;
                  const StatusIcon = cfg.icon;
                  const isOverdue = ms.due_date < today && ms.status !== 'completed';
                  const isMineOrAdmin =
                    currentUser?.id === ms.owner_id || canManageMilestones;

                  return (
                    <div
                      key={ms.id}
                      className={cn(
                        'ml-10 rounded-xl border p-4 relative',
                        isOverdue ? 'border-l-4 border-l-red-500 border-t-red-100 border-b-red-100 border-r-red-100' : 'border-border'
                      )}
                    >
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          'absolute -left-[33px] top-4 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center',
                          cfg.bg
                        )}
                      >
                        <StatusIcon className={cn('w-3 h-3', cfg.color)} />
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{ms.title}</p>
                          {ms.description && (
                            <p className="text-xs text-muted-foreground mt-1">{ms.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due {new Date(ms.due_date).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                            </span>
                            {isOverdue && <span className="text-red-500 font-medium">Overdue</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full', cfg.bg, cfg.color)}>
                            {cfg.label}
                          </span>
                          {ms.status !== 'completed' && isMineOrAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleCompleteMilestone(ms.id)}
                              disabled={completingId === ms.id}
                            >
                              {completingId === ms.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <><CheckCircle2 className="w-3 h-3 mr-1" /> Mark Complete</>
                              }
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Milestone Dialog */}
          <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Milestone</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-xs mb-1.5">Title <span className="text-red-500">*</span></Label>
                  <Input
                    value={msTitle}
                    onChange={(e) => setMsTitle(e.target.value)}
                    placeholder="e.g. Phase 1 Rollout Complete"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5">Description</Label>
                  <Textarea
                    value={msDesc}
                    onChange={(e) => setMsDesc(e.target.value)}
                    placeholder="Optional description..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-1.5">Due Date <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={msDueDate}
                      onChange={(e) => setMsDueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5">Status</Label>
                    <Select value={msStatus} onValueChange={(v) => setMsStatus(v as MilestoneStatus)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMilestoneDialogOpen(false)} disabled={savingMilestone}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#0F6E56] hover:bg-[#085041]"
                  onClick={handleAddMilestone}
                  disabled={savingMilestone}
                >
                  {savingMilestone ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  Add Milestone
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Implementation Log ── */}
        <TabsContent value="log" className="space-y-4">
          {/* Post Update */}
          {canPostUpdate && (
            <Card className="border-[#0F6E56]/20">
              <CardContent className="py-4 space-y-3">
                <Label className="text-xs font-semibold text-[#0F6E56]">Post Implementation Update</Label>
                <Textarea
                  placeholder="Describe progress, challenges, or outcomes..."
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="bg-[#0F6E56] hover:bg-[#085041]"
                    onClick={handlePostUpdate}
                    disabled={postingUpdate || !updateContent.trim()}
                  >
                    {postingUpdate ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                    Post Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feed */}
          {updates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No implementation updates yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {updates.map((u) => (
                <Card key={u.id}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#0F6E56]/10 text-[#0F6E56] text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {getInitials(u.author_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{u.author_name}</p>
                          <p className="text-xs text-muted-foreground shrink-0">{formatDateTime(u.created_at)}</p>
                        </div>
                        <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{u.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Summary Report ── */}
        <TabsContent value="report">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Auto-Generated Summary Report</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.print()}
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre
                id="summary-report"
                className="font-mono text-xs text-foreground/80 whitespace-pre-wrap bg-muted/30 rounded-lg p-5 leading-relaxed border border-border print:border-0 print:bg-white print:p-0"
              >
                {generateSummaryText()}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
