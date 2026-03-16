'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  FileText,
  CheckCircle2,
  Clock,
  FilePlus,
  AlertTriangle,
  Activity,
  ArrowRight,
  TrendingUp,
  Building2,
  Users,
  ListChecks,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import {
  getDashboardStats,
  policies,
  auditLogs,
  workflowSteps,
  getProfile,
  getMDA,
  indicators,
  indicatorReadings,
} from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';
import type { TaskWithRelations } from '@/lib/types/database.types';
import { PRIORITY_CFG } from '@/components/tasks/KanbanBoard';
import { cn } from '@/lib/utils';
import { formatDateTime, getTrafficLightColor } from '@/lib/utils';
import type { Profile } from '@/lib/types/database.types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#0F6E56', '#1D9E75', '#F59E0B', '#6366F1', '#EF4444', '#8B5CF6'];

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myTasks, setMyTasks] = useState<TaskWithRelations[]>([]);
  const [mdaPolicyCounts, setMdaPolicyCounts] = useState<{ name: string; count: number }[]>([]);
  const stats = getDashboardStats();

  useEffect(() => {
    const supabase = createClient();

    // Load MDA policy counts from DB
    Promise.all([
      supabase.from('mdas').select('id, code'),
      supabase.from('policies').select('mda_id'),
    ]).then(([{ data: mdaRows }, { data: policyRows }]) => {
      if (mdaRows && policyRows) {
        const counts = mdaRows.map((mda) => ({
          name: mda.code,
          count: policyRows.filter((p) => p.mda_id === mda.id).length,
        }));
        setMdaPolicyCounts(counts);
      }
    });

    const stored = localStorage.getItem('demo_user');
    if (stored) {
      const p: Profile = JSON.parse(stored);
      setProfile(p);
      // Load top 5 tasks for this user
      supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', p.id)
        .neq('status', 'cancelled')
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5)
        .then(({ data }) => {
          if (data) setMyTasks(data as TaskWithRelations[]);
        });
    }
  }, []);

  const recentActivity = auditLogs
    .map((al) => ({ ...al, actor: getProfile(al.actor_id) }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const pendingSteps = workflowSteps
    .filter((ws) => ws.status === 'pending')
    .map((ws) => {
      const policy = policies.find((p) => p.id === ws.policy_id);
      const approver = getProfile(ws.approver_id);
      return { ...ws, policy, approver };
    });

  const statusDistribution = [
    { name: 'Published', value: stats.published },
    { name: 'In Review', value: stats.inReview },
    { name: 'Draft', value: stats.drafts },
    { name: 'Approved', value: policies.filter((p) => p.status === 'approved').length },
    { name: 'Rejected', value: policies.filter((p) => p.status === 'rejected').length },
  ].filter((d) => d.value > 0);

  // M&E summary — latest readings vs targets
  const meHighlights = indicators.slice(0, 4).map((ind) => {
    const readings = indicatorReadings.filter((ir) => ir.indicator_id === ind.id);
    const latest = readings[readings.length - 1];
    const traffic = getTrafficLightColor(latest?.value ?? ind.baseline, ind.target);
    return { ...ind, latestValue: latest?.value ?? ind.baseline, traffic };
  });

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'created',
      updated: 'updated',
      published: 'published',
      submitted_for_review: 'submitted for review',
      approved: 'approved',
      rejected: 'rejected',
      reading_submitted: 'submitted reading',
      created_user: 'created user',
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {profile ? `Welcome, ${profile.full_name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground">Policy management overview and activity feed</p>
        </div>
        <Button asChild className="bg-[#0F6E56] hover:bg-[#085041] shadow-lg shadow-[#0F6E56]/20">
          <Link href="/policies/new">
            <FilePlus className="w-4 h-4 mr-2" /> New Policy
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {[
          { label: 'Total Policies', value: stats.totalPolicies, icon: FileText, color: 'text-[#0F6E56]', bg: 'bg-[#0F6E56]/10' },
          { label: 'Published', value: stats.published, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'In Review', value: stats.inReview, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pending Approvals', value: stats.pendingApprovals, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow duration-200 border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-3xl font-bold text-foreground">{s.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Policy Distribution Pie */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0F6E56]" />
              Policy Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {statusDistribution.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* MDA Policy Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0F6E56]" />
              Policies per MDA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mdaPolicyCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="count" fill="#0F6E56" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* M&E Traffic Lights & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* M&E Highlights */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0F6E56]" />
                M&E Highlights
              </CardTitle>
              <Link href="/policies" className="text-xs text-[#0F6E56] hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {meHighlights.map((ind) => {
                const pct = ind.target > 0 ? Math.round((ind.latestValue / ind.target) * 100) : 0;
                const trafficColors: Record<string, string> = {
                  emerald: 'bg-emerald-500',
                  amber: 'bg-amber-500',
                  red: 'bg-red-500',
                  gray: 'bg-gray-400',
                };
                return (
                  <div key={ind.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${trafficColors[ind.traffic.color]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ind.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ind.latestValue} / {ind.target} {ind.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{pct}%</p>
                      <p className="text-[10px] text-muted-foreground">{ind.traffic.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Pending Approvals
              </CardTitle>
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                {pendingSteps.length} pending
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {pendingSteps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pending approvals</p>
            ) : (
              <div className="space-y-3">
                {pendingSteps.map((ws) => (
                  <Link
                    key={ws.id}
                    href={`/policies/${ws.policy_id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {ws.policy?.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Awaiting {ws.approver?.full_name} · Step {ws.step_order}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Tasks Widget */}
      {myTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-[#0F6E56]" />
                My Tasks
              </CardTitle>
              <Link href="/tasks" className="text-xs text-[#0F6E56] hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myTasks.map((task) => {
                const today = new Date().toISOString().split('T')[0];
                const isOverdue = task.due_date && task.due_date < today;
                const pCfg = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.medium;
                return (
                  <Link
                    key={task.id}
                    href="/tasks"
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', pCfg.bg, pCfg.color)}>
                      {pCfg.label}
                    </span>
                    <p className="text-sm text-foreground font-medium flex-1 truncate">{task.title}</p>
                    {task.due_date && (
                      <span className={cn('flex items-center gap-1 text-[10px] shrink-0', isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
                        {isOverdue && <AlertCircle className="w-2.5 h-2.5" />}
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(task.due_date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0F6E56]" />
              Recent Activity
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((log) => {
              const policy = policies.find((p) => p.id === log.entity_id);
              return (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary mt-0.5">
                    {log.actor?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{log.actor?.full_name}</span>{' '}
                      {getActionLabel(log.action)}{' '}
                      {policy ? (
                        <Link href={`/policies/${log.entity_id}`} className="text-[#0F6E56] hover:underline font-medium">
                          {policy.title.length > 50 ? policy.title.slice(0, 50) + '…' : policy.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{log.entity_type}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(log.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
