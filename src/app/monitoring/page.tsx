'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, Download, ChevronDown,
  ChevronRight, ArrowRight, Activity, Building2, BarChart3, MessageSquare,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { mdas as mockMdas } from '@/lib/mock-data';
import { LineChart, Line, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import type { PolicyHealthStatus } from '@/lib/types/database.types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IndicatorSummary {
  id: string;
  name: string;
  target: number;
  unit: string;
  latest_value: number | null;
  score: number | null;
  readings: { period: string; value: number }[];
}

interface MilestoneSummary {
  id: string;
  title: string;
  status: string;
  due_date: string;
}

interface PolicyHealthRow {
  id: string;
  title: string;
  mda_code: string;
  sector: string | null;
  updated_at: string;
  health_status: PolicyHealthStatus;
  overall_score: number | null;
  indicators: IndicatorSummary[];
  milestones: MilestoneSummary[];
  overdue_count: number;
  milestone_completed: number;
  milestone_total: number;
}

interface UpdateEntry {
  id: string;
  policy_id: string;
  policy_title: string;
  content: string;
  author: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeHealth(score: number | null): PolicyHealthStatus {
  if (score === null) return 'no_data';
  if (score >= 90) return 'on_track';
  if (score >= 60) return 'at_risk';
  return 'off_track';
}

const HEALTH_CONFIG: Record<PolicyHealthStatus, {
  label: string; color: string; icon: React.ElementType; bg: string; border: string;
}> = {
  on_track:  { label: 'On Track',  color: 'text-emerald-700', icon: CheckCircle2,  bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  at_risk:   { label: 'At Risk',   color: 'text-amber-700',   icon: AlertTriangle,  bg: 'bg-amber-50',    border: 'border-amber-200'   },
  off_track: { label: 'Off Track', color: 'text-red-700',     icon: XCircle,        bg: 'bg-red-50',      border: 'border-red-200'     },
  no_data:   { label: 'No Data',   color: 'text-gray-500',    icon: Clock,          bg: 'bg-gray-50',     border: 'border-gray-200'    },
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const [rows, setRows] = useState<PolicyHealthRow[]>([]);
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // 1. Fetch active policies (published or approved)
    const { data: policies } = await supabase
      .from('policies')
      .select('id, title, mda_id, updated_at, sector')
      .in('status', ['published', 'approved'])
      .order('updated_at', { ascending: false });

    if (!policies || policies.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const policyIds = policies.map((p) => p.id);
    const mdaIds = [...new Set(policies.map((p: any) => p.mda_id))];

    // 2. Parallel fetches
    const [{ data: mdas }, { data: indicators }, { data: milestones }] =
      await Promise.all([
        supabase.from('mdas').select('id, code, sector').in('id', mdaIds),
        supabase.from('indicators').select('id, policy_id, name, target, unit').in('policy_id', policyIds),
        supabase.from('policy_milestones').select('id, policy_id, title, status, due_date').in('policy_id', policyIds),
      ]);

    // 3. Readings for all indicators
    const indicatorIds = (indicators ?? []).map((i) => i.id);
    const { data: readings } = indicatorIds.length > 0
      ? await supabase
          .from('indicator_readings')
          .select('indicator_id, value, period, created_at')
          .in('indicator_id', indicatorIds)
          .order('created_at', { ascending: true })
      : { data: [] };

    // 4. Build maps
    const mdaMap: Record<string, { code: string; sector: string }> =
      Object.fromEntries((mdas ?? []).map((m) => [m.id, m]));

    const indicatorsByPolicy: Record<string, typeof indicators> = {};
    (indicators ?? []).forEach((i) => {
      if (!indicatorsByPolicy[i.policy_id]) indicatorsByPolicy[i.policy_id] = [];
      indicatorsByPolicy[i.policy_id]!.push(i);
    });

    const readingsByIndicator: Record<string, { period: string; value: number; created_at: string }[]> = {};
    (readings ?? []).forEach((r) => {
      if (!readingsByIndicator[r.indicator_id]) readingsByIndicator[r.indicator_id] = [];
      readingsByIndicator[r.indicator_id]!.push(r);
    });

    const milestonesByPolicy: Record<string, MilestoneSummary[]> = {};
    (milestones ?? []).forEach((m) => {
      if (!milestonesByPolicy[m.policy_id]) milestonesByPolicy[m.policy_id] = [];
      milestonesByPolicy[m.policy_id]!.push(m);
    });

    const today = new Date().toISOString().split('T')[0];

    const computedRows: PolicyHealthRow[] = (policies as any[]).map((policy) => {
      const mda = mdaMap[policy.mda_id];
      const policyIndicators = indicatorsByPolicy[policy.id] ?? [];
      const policyMilestones = milestonesByPolicy[policy.id] ?? [];

      let totalScore = 0;
      let scoredCount = 0;

      const indicatorsWithData: IndicatorSummary[] = policyIndicators.map((ind) => {
        const indReadings = readingsByIndicator[ind.id] ?? [];
        const latestReading = indReadings[indReadings.length - 1];
        const latestValue = latestReading?.value ?? null;
        const score =
          latestValue !== null && ind.target > 0
            ? (latestValue / ind.target) * 100
            : null;
        if (score !== null) { totalScore += score; scoredCount++; }
        return {
          id: ind.id,
          name: ind.name,
          target: ind.target,
          unit: ind.unit,
          latest_value: latestValue,
          score,
          readings: indReadings.map((r) => ({ period: r.period, value: r.value })),
        };
      });

      const overallScore = scoredCount > 0 ? totalScore / scoredCount : null;

      return {
        id: policy.id,
        title: policy.title,
        mda_code: mda?.code ?? 'N/A',
        sector: (policy.sector ?? mda?.sector) || null,
        updated_at: policy.updated_at,
        health_status: computeHealth(overallScore),
        overall_score: overallScore,
        indicators: indicatorsWithData,
        milestones: policyMilestones,
        overdue_count: policyMilestones.filter(
          (m) => m.due_date < today && m.status !== 'completed'
        ).length,
        milestone_completed: policyMilestones.filter((m) => m.status === 'completed').length,
        milestone_total: policyMilestones.length,
      };
    });

    setRows(computedRows);

    // 5. Recent implementation updates
    const { data: updatesRaw } = await supabase
      .from('implementation_updates')
      .select('id, policy_id, content, submitted_by, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (updatesRaw && updatesRaw.length > 0) {
      const authorIds = [...new Set(updatesRaw.map((u) => u.submitted_by))];
      const updatePolicyIds = [...new Set(updatesRaw.map((u) => u.policy_id))];
      const [{ data: authorProfiles }, { data: updatePolicies }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', authorIds),
        supabase.from('policies').select('id, title').in('id', updatePolicyIds),
      ]);
      const authorMap = Object.fromEntries((authorProfiles ?? []).map((p) => [p.id, p.full_name]));
      const policyTitleMap = Object.fromEntries((updatePolicies ?? []).map((p) => [p.id, p.title]));
      setUpdates(
        updatesRaw.map((u) => ({
          id: u.id,
          policy_id: u.policy_id,
          policy_title: policyTitleMap[u.policy_id] ?? 'Unknown Policy',
          content: u.content,
          author: authorMap[u.submitted_by] ?? 'Unknown',
          created_at: u.created_at,
        }))
      );
    } else {
      setUpdates([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Summary stats ──
  const onTrack  = rows.filter((r) => r.health_status === 'on_track').length;
  const atRisk   = rows.filter((r) => r.health_status === 'at_risk').length;
  const offTrack = rows.filter((r) => r.health_status === 'off_track').length;
  const overdueMilestones = rows.reduce((s, r) => s + r.overdue_count, 0);

  // ── CSV export ──
  const exportCSV = () => {
    const headers = ['Policy Title', 'MDA', 'Sector', 'Health Status', 'KPI Score (%)', 'Milestones Completed', 'Overdue Milestones', 'Last Updated'];
    const csvData = rows.map((r) =>
      [
        `"${r.title.replace(/"/g, '""')}"`,
        r.mda_code,
        r.sector ?? '',
        r.health_status,
        r.overall_score !== null ? r.overall_score.toFixed(1) : 'N/A',
        `${r.milestone_completed}/${r.milestone_total}`,
        r.overdue_count,
        new Date(r.updated_at).toLocaleDateString(),
      ].join(',')
    );
    const csv = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policy-health-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Policy Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Real-time health dashboard for all active policies
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          disabled={loading || rows.length === 0}
          className="gap-2"
        >
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="On Track"
          value={loading ? null : onTrack}
          icon={CheckCircle2}
          color="text-emerald-700"
          bg="bg-emerald-50"
          border="border-emerald-200"
        />
        <StatCard
          label="At Risk"
          value={loading ? null : atRisk}
          icon={AlertTriangle}
          color="text-amber-700"
          bg="bg-amber-50"
          border="border-amber-200"
        />
        <StatCard
          label="Off Track"
          value={loading ? null : offTrack}
          icon={XCircle}
          color="text-red-700"
          bg="bg-red-50"
          border="border-red-200"
        />
        <StatCard
          label="Overdue Milestones"
          value={loading ? null : overdueMilestones}
          icon={Clock}
          color="text-red-700"
          bg="bg-red-50"
          border="border-red-200"
        />
      </div>

      {/* Main content: table + feed */}
      <div className="flex gap-5 items-start">
        {/* Policy health table */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#0F6E56]" />
                Policy Health Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : rows.length === 0 ? (
                <div className="py-12 text-center">
                  <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active policies to monitor.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Policies appear here once approved or published.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    <span>Policy</span>
                    <span className="w-14 text-center">Health</span>
                    <span className="w-20 text-center hidden lg:block">KPI Score</span>
                    <span className="w-20 text-center hidden lg:block">Milestones</span>
                    <span className="w-20 text-center hidden lg:block">Updated</span>
                    <span className="w-6" />
                  </div>

                  {rows.map((row) => (
                    <PolicyRow
                      key={row.id}
                      row={row}
                      expanded={expanded === row.id}
                      onToggle={() => setExpanded(expanded === row.id ? null : row.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent updates feed */}
        <div className="w-72 shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0F6E56]" />
                Recent Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : updates.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <MessageSquare className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No updates posted yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {updates.map((u) => (
                    <div key={u.id} className="px-4 py-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#0F6E56]/15 text-[#0F6E56] text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                          {getInitials(u.author)}
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate">{u.author}</span>
                      </div>
                      <Link
                        href={`/monitoring/${u.policy_id}`}
                        className="text-[10px] font-medium text-[#0F6E56] hover:underline line-clamp-1"
                      >
                        {u.policy_title}
                      </Link>
                      <p className="text-xs text-muted-foreground line-clamp-2">{u.content}</p>
                      <p className="text-[10px] text-muted-foreground/60">{formatDate(u.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, bg, border,
}: {
  label: string;
  value: number | null;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <Card className={cn('border', border)}>
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
            <Icon className={cn('w-5 h-5', color)} />
          </div>
          <div>
            {value === null ? (
              <Skeleton className="h-7 w-10 mb-1" />
            ) : (
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
            )}
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const SPARKLINE_COLORS = ['#0F6E56', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

function PolicyRow({
  row, expanded, onToggle,
}: {
  row: PolicyHealthRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = HEALTH_CONFIG[row.health_status];
  const Icon = cfg.icon;

  return (
    <>
      {/* Row */}
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors items-center"
      >
        {/* Title + MDA */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{row.title}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <Building2 className="w-3 h-3" />
            <span>{row.mda_code}</span>
            {row.sector && (
              <>
                <span>·</span>
                <span>{row.sector}</span>
              </>
            )}
          </div>
        </div>

        {/* Health badge */}
        <div className={cn('w-14 flex items-center justify-center gap-1 text-[10px] font-semibold px-1.5 py-1 rounded-full', cfg.bg, cfg.color)}>
          <Icon className="w-3 h-3" />
        </div>

        {/* KPI score */}
        <div className="w-20 hidden lg:block text-center">
          {row.overall_score !== null ? (
            <span className={cn('text-sm font-bold', cfg.color)}>
              {row.overall_score.toFixed(0)}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Milestone progress */}
        <div className="w-20 hidden lg:block text-center">
          {row.milestone_total > 0 ? (
            <span className="text-xs text-muted-foreground">
              {row.milestone_completed}/{row.milestone_total}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {row.overdue_count > 0 && (
            <span className="block text-[10px] text-red-500">{row.overdue_count} overdue</span>
          )}
        </div>

        {/* Last updated */}
        <div className="w-20 hidden lg:block text-center">
          <span className="text-xs text-muted-foreground">{formatDate(row.updated_at)}</span>
        </div>

        {/* Expand icon */}
        <div className="w-6 flex justify-center">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded inline detail */}
      {expanded && (
        <div className="px-4 pb-4 bg-muted/20 border-t border-border">
          <div className="pt-4 grid lg:grid-cols-2 gap-5">
            {/* KPI Sparklines */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#0F6E56]" /> KPI Indicators
              </p>
              {row.indicators.length === 0 ? (
                <p className="text-xs text-muted-foreground">No indicators configured.</p>
              ) : (
                <div className="space-y-3">
                  {row.indicators.map((ind, idx) => (
                    <div key={ind.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground truncate">{ind.name}</span>
                        <span className={cn('font-semibold ml-2 shrink-0', ind.score !== null
                          ? ind.score >= 90 ? 'text-emerald-600' : ind.score >= 60 ? 'text-amber-600' : 'text-red-600'
                          : 'text-gray-400')}>
                          {ind.score !== null ? `${ind.score.toFixed(0)}%` : 'N/A'}
                        </span>
                      </div>
                      {ind.readings.length > 1 ? (
                        <div className="h-10">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ind.readings}>
                              <ReTooltip
                                contentStyle={{ fontSize: '10px', padding: '2px 6px' }}
                                formatter={(v) => [`${v ?? ''} ${ind.unit}`, ind.name]}
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke={SPARKLINE_COLORS[idx % SPARKLINE_COLORS.length]}
                                strokeWidth={1.5}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/60 italic">
                          {ind.latest_value !== null
                            ? `Current: ${ind.latest_value} ${ind.unit} / Target: ${ind.target} ${ind.unit}`
                            : 'No readings yet'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Milestone checklist */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0F6E56]" /> Milestones
              </p>
              {row.milestones.length === 0 ? (
                <p className="text-xs text-muted-foreground">No milestones added yet.</p>
              ) : (
                <div className="space-y-2">
                  {row.milestones.slice(0, 5).map((m) => {
                    const statusCfg: Record<string, string> = {
                      completed:   'text-emerald-600',
                      in_progress: 'text-amber-600',
                      pending:     'text-gray-400',
                      overdue:     'text-red-500',
                    };
                    return (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        <CheckCircle2
                          className={cn('w-3.5 h-3.5 shrink-0', statusCfg[m.status] ?? 'text-gray-400')}
                        />
                        <span className={cn('truncate', m.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground')}>
                          {m.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-auto">
                          {new Date(m.due_date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  {row.milestones.length > 5 && (
                    <p className="text-[10px] text-muted-foreground/60">
                      +{row.milestones.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* View full detail link */}
          <div className="mt-4 flex justify-end">
            <Link href={`/monitoring/${row.id}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                Full Monitoring Detail <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
