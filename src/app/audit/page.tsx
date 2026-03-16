'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  ScrollText, AlertTriangle, XCircle, Users, Flag, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AuditLogExplorer from '@/components/audit/AuditLogExplorer';
import { profiles as mockProfiles } from '@/lib/mock-data';
import type { Profile } from '@/lib/types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditStats {
  todayTotal: number;
  criticalLast7d: number;
  mostActiveUser: string;
  mostModifiedPolicy: string;
}

interface DayBucket {
  date: string;
  info: number;
  warning: number;
  critical: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [chartData, setChartData] = useState<DayBucket[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('demo_user');
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const supabase = createClient();

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);

    // Parallel queries
    const [
      { count: todayTotal },
      { count: criticalLast7d },
      { data: recentLogs },
    ] = await Promise.all([
      supabase.from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      supabase.from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('audit_logs')
        .select('actor_id, entity_type, entity_id, severity, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString()),
    ]);

    // Most active user (by actor_id count)
    const actorCounts: Record<string, number> = {};
    const policyCounts: Record<string, number> = {};
    const dailyBuckets: Record<string, { info: number; warning: number; critical: number }> = {};

    (recentLogs ?? []).forEach((log) => {
      // Actor frequency
      actorCounts[log.actor_id] = (actorCounts[log.actor_id] ?? 0) + 1;

      // Policy frequency
      if (log.entity_type === 'policy') {
        policyCounts[log.entity_id] = (policyCounts[log.entity_id] ?? 0) + 1;
      }

      // Daily buckets for chart
      const day = (log.created_at as string).split('T')[0];
      if (!dailyBuckets[day]) dailyBuckets[day] = { info: 0, warning: 0, critical: 0 };
      const sev = (log.severity as 'info' | 'warning' | 'critical') ?? 'info';
      dailyBuckets[day][sev]++;
    });

    // Most active user
    const topActorId = Object.entries(actorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topActor = topActorId
      ? (mockProfiles.find((p) => p.id === topActorId)?.full_name ?? topActorId.slice(0, 8))
      : '—';

    // Most modified policy
    const topPolicyId = Object.entries(policyCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    let topPolicyTitle = '—';
    if (topPolicyId) {
      const { data: pol } = await supabase
        .from('policies').select('title').eq('id', topPolicyId).single();
      topPolicyTitle = pol?.title ?? topPolicyId.slice(0, 8);
    }

    setStats({
      todayTotal:         todayTotal ?? 0,
      criticalLast7d:     criticalLast7d ?? 0,
      mostActiveUser:     topActor,
      mostModifiedPolicy: topPolicyTitle,
    });

    // Build chart data — last 30 days, sorted
    const chartRows: DayBucket[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      chartRows.push({
        date: d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
        ...(dailyBuckets[key] ?? { info: 0, warning: 0, critical: 0 }),
      });
    }
    setChartData(chartRows);
    setStatsLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Guard: only super_admin
  if (currentUser && currentUser.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-muted-foreground">Access restricted to Super Administrators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          Tamper-proof system activity log for compliance and governance oversight
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Actions Today"
          value={statsLoading ? null : String(stats?.todayTotal ?? 0)}
          icon={Activity}
          color="text-blue-700"
          bg="bg-blue-50"
        />
        <StatCard
          label="Critical (7 days)"
          value={statsLoading ? null : String(stats?.criticalLast7d ?? 0)}
          icon={XCircle}
          color="text-red-700"
          bg="bg-red-50"
        />
        <StatCard
          label="Most Active User"
          value={statsLoading ? null : (stats?.mostActiveUser ?? '—')}
          icon={Users}
          color="text-emerald-700"
          bg="bg-emerald-50"
          small
        />
        <StatCard
          label="Most Modified Policy"
          value={statsLoading ? null : (stats?.mostModifiedPolicy ?? '—')}
          icon={ScrollText}
          color="text-amber-700"
          bg="bg-amber-50"
          small
        />
      </div>

      {/* Timeline chart */}
      <Card>
        <CardContent className="pt-5 pb-3">
          <p className="text-sm font-semibold text-foreground mb-4">
            Activity Timeline — Last 30 Days
          </p>
          {statsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '11px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="info"     stackId="a" fill="#3b82f6" name="Info"     radius={[0, 0, 0, 0]} />
                  <Bar dataKey="warning"  stackId="a" fill="#f59e0b" name="Warning"  radius={[0, 0, 0, 0]} />
                  <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explorer tabs */}
      <Tabs defaultValue="all">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all"     className="gap-1.5 text-xs"><ScrollText className="w-3.5 h-3.5" /> All Logs</TabsTrigger>
          <TabsTrigger value="flagged" className="gap-1.5 text-xs"><Flag       className="w-3.5 h-3.5" /> Flagged for Review</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <AuditLogExplorer showFlagButton />
        </TabsContent>

        <TabsContent value="flagged" className="mt-4">
          <AuditLogExplorer showFlagButton flaggedOnly />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, bg, small = false,
}: {
  label: string;
  value: string | null;
  icon: React.ElementType;
  color: string;
  bg: string;
  small?: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
            <Icon className={cn('w-5 h-5', color)} />
          </div>
          <div className="min-w-0">
            {value === null ? (
              <Skeleton className="h-6 w-12 mb-1" />
            ) : (
              <p className={cn('font-bold leading-tight', small ? 'text-sm truncate' : 'text-2xl', color)}>
                {value}
              </p>
            )}
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
