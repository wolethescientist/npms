'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertTriangle, XCircle, Info, Flag, Download, ChevronLeft, ChevronRight,
  Search, Building2, User, Clock, Shield, Globe,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { mdas as mockMdas, profiles as mockProfiles } from '@/lib/mock-data';
import type { AuditSeverity } from '@/lib/types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogRow {
  id: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  diff: Record<string, unknown> | null;
  severity: AuditSeverity;
  flagged: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // enriched
  actor_name: string;
  actor_role: string;
  actor_mda: string;
}

interface Props {
  showFlagButton?: boolean;
  flaggedOnly?: boolean;
}

const PAGE_SIZE = 50;

const SEVERITY_CFG: Record<AuditSeverity, {
  label: string; color: string; bg: string; row: string; icon: React.ElementType;
}> = {
  critical: { label: 'Critical', color: 'text-red-700',    bg: 'bg-red-100',    row: 'bg-red-50/60',    icon: XCircle       },
  warning:  { label: 'Warning',  color: 'text-amber-700',  bg: 'bg-amber-100',  row: 'bg-amber-50/60',  icon: AlertTriangle },
  info:     { label: 'Info',     color: 'text-blue-700',   bg: 'bg-blue-100',   row: '',                icon: Info          },
};

const ENTITY_TYPES = ['policy', 'workflow_step', 'user', 'indicator', 'milestone'];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', mda_admin: 'MDA Admin', policy_officer: 'Policy Officer',
  reviewer: 'Reviewer', final_approver: 'Final Approver', me_officer: 'M&E Officer',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditLogExplorer({ showFlagButton = false, flaggedOnly = false }: Props) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [severities, setSeverities] = useState<AuditSeverity[]>([]);
  const [entityType, setEntityType] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  // Sheet
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Enrich a raw log row with actor profile data
  function enrich(
    raw: Record<string, unknown>,
    profileMap: Record<string, { full_name: string; role: string; mda_id: string | null }>,
  ): AuditLogRow {
    const actor = profileMap[raw.actor_id as string];
    const mdaCode = actor?.mda_id
      ? (mockMdas.find((m) => m.id === actor.mda_id)?.code ?? actor.mda_id.slice(0, 6))
      : '—';
    return {
      id:          raw.id as string,
      actor_id:    raw.actor_id as string,
      entity_type: raw.entity_type as string,
      entity_id:   raw.entity_id as string,
      action:      raw.action as string,
      diff:        raw.diff as Record<string, unknown> | null,
      severity:    (raw.severity as AuditSeverity) ?? 'info',
      flagged:     (raw.flagged as boolean) ?? false,
      ip_address:  raw.ip_address as string | null,
      user_agent:  raw.user_agent as string | null,
      created_at:  raw.created_at as string,
      actor_name:  actor?.full_name ?? 'Unknown',
      actor_role:  ROLE_LABELS[actor?.role ?? ''] ?? (actor?.role ?? '—'),
      actor_mda:   mdaCode,
    };
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Resolve actor IDs from name search
    let actorIdFilter: string[] | null = null;
    if (debouncedSearch && !/^[0-9a-f-]{36}$/i.test(debouncedSearch)) {
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `%${debouncedSearch}%`);
      actorIdFilter = (matchedProfiles ?? []).map((p) => p.id);
      if (actorIdFilter.length === 0) {
        setLogs([]); setTotalCount(0); setLoading(false);
        return;
      }
    }

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (flaggedOnly) query = query.eq('flagged', true);
    if (severities.length > 0) query = query.in('severity', severities);
    if (entityType) query = query.eq('entity_type', entityType);
    if (actionFilter) query = query.ilike('action', `%${actionFilter}%`);
    if (dateFrom) query = query.gte('created_at', dateFrom + 'T00:00:00Z');
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59Z');

    if (debouncedSearch) {
      if (/^[0-9a-f-]{36}$/i.test(debouncedSearch)) {
        // UUID — search entity_id
        query = query.eq('entity_id', debouncedSearch);
      } else if (actorIdFilter) {
        query = query.in('actor_id', actorIdFilter);
      }
    }

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data: rawLogs, count, error } = await query;

    if (error) { setLoading(false); return; }

    setTotalCount(count ?? 0);

    // Enrich with actor profiles
    const actorIds = [...new Set((rawLogs ?? []).map((r) => r.actor_id as string))];
    const mockProfileMap = Object.fromEntries(
      mockProfiles.map((p) => [p.id, { full_name: p.full_name, role: p.role, mda_id: p.mda_id }])
    );

    // Fetch any DB profiles not in mock data
    const unknownIds = actorIds.filter((id) => !mockProfileMap[id]);
    if (unknownIds.length > 0) {
      const { data: dbProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, role, mda_id')
        .in('id', unknownIds);
      (dbProfiles ?? []).forEach((p) => {
        mockProfileMap[p.id] = { full_name: p.full_name, role: p.role, mda_id: p.mda_id };
      });
    }

    setLogs((rawLogs ?? []).map((r) => enrich(r, mockProfileMap)));
    setLoading(false);
  }, [debouncedSearch, severities, entityType, actionFilter, dateFrom, dateTo, page, flaggedOnly]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(0);
    }, 400);
  };

  const toggleSeverity = (s: AuditSeverity) => {
    setSeverities((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
    setPage(0);
  };

  const handleFlag = async (logId: string, currentFlagged: boolean) => {
    const supabase = createClient();
    await supabase.from('audit_logs').update({ flagged: !currentFlagged }).eq('id', logId);
    setLogs((prev) => prev.map((l) => l.id === logId ? { ...l, flagged: !currentFlagged } : l));
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Actor', 'Role', 'MDA', 'Action', 'Entity Type', 'Entity ID', 'Severity', 'Flagged'];
    const rows = logs.map((l) =>
      [
        new Date(l.created_at).toLocaleString(),
        `"${l.actor_name}"`,
        l.actor_role,
        l.actor_mda,
        l.action,
        l.entity_type,
        l.entity_id,
        l.severity,
        l.flagged ? 'YES' : 'NO',
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <>
      {/* Filters bar */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search actor name or entity UUID…"
              className="h-9 pl-8 text-sm"
            />
          </div>

          {/* Severity toggles */}
          <div className="flex items-center gap-1.5">
            {(Object.keys(SEVERITY_CFG) as AuditSeverity[]).map((s) => {
              const cfg = SEVERITY_CFG[s];
              const active = severities.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSeverity(s)}
                  className={cn(
                    'text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
                    active ? `${cfg.bg} ${cfg.color} border-transparent` : 'border-border text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Export */}
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={logs.length === 0} className="gap-1.5 h-9">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Entity type */}
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(0); }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          >
            <option value="">All entity types</option>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Action filter */}
          <Input
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            placeholder="Filter by action…"
            className="h-8 text-xs w-40"
          />

          {/* Date range */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          />

          {/* Clear filters */}
          {(severities.length > 0 || entityType || actionFilter || dateFrom || dateTo || search) && (
            <button
              onClick={() => {
                setSeverities([]); setEntityType(''); setActionFilter('');
                setDateFrom(''); setDateTo(''); setSearch(''); setDebouncedSearch(''); setPage(0);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-3 px-4 py-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/30">
            <span className="w-16">Severity</span>
            <span>Actor</span>
            <span>Action / Entity</span>
            <span className="hidden lg:block">Entity ID</span>
            <span className="w-28 hidden md:block">Timestamp</span>
            <span className="w-8" />
          </div>

          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-14 text-center">
              <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No audit logs match the current filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const cfg = SEVERITY_CFG[log.severity] ?? SEVERITY_CFG.info;
                const SevIcon = cfg.icon;
                return (
                  <div
                    key={log.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedLog(log); setSheetOpen(true); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedLog(log); setSheetOpen(true); } }}
                    className={cn(
                      'w-full grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors items-center cursor-pointer',
                      cfg.row
                    )}
                  >
                    {/* Severity badge */}
                    <div className="w-16">
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                        <SevIcon className="w-2.5 h-2.5" />
                        {cfg.label}
                      </span>
                      {log.flagged && (
                        <span className="ml-1 inline-flex items-center">
                          <Flag className="w-2.5 h-2.5 text-red-500 fill-red-500" />
                        </span>
                      )}
                    </div>

                    {/* Actor */}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{log.actor_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{log.actor_role} · {log.actor_mda}</p>
                    </div>

                    {/* Action + entity type */}
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-foreground truncate">{log.action}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{log.entity_type}</p>
                    </div>

                    {/* Entity ID */}
                    <p className="text-[10px] font-mono text-muted-foreground/70 truncate hidden lg:block w-28">
                      {log.entity_id.slice(0, 8)}…
                    </p>

                    {/* Timestamp */}
                    <p className="text-[10px] text-muted-foreground shrink-0 hidden md:block w-28 text-right">
                      {new Date(log.created_at).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>

                    {/* Flag button */}
                    {showFlagButton && (
                      <div className="w-8 flex justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFlag(log.id, log.flagged); }}
                          className={cn(
                            'p-1 rounded hover:bg-muted transition-colors',
                            log.flagged ? 'text-red-500' : 'text-muted-foreground/30 hover:text-red-400'
                          )}
                          title={log.flagged ? 'Remove flag' : 'Flag for review'}
                        >
                          <Flag className={cn('w-3 h-3', log.flagged && 'fill-current')} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLog && <AuditDetailPanel log={selectedLog} onFlag={showFlagButton ? handleFlag : undefined} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Audit detail panel (sheet body) ─────────────────────────────────────────

function AuditDetailPanel({
  log,
  onFlag,
}: {
  log: AuditLogRow;
  onFlag?: (id: string, current: boolean) => void;
}) {
  const cfg = SEVERITY_CFG[log.severity] ?? SEVERITY_CFG.info;
  const SevIcon = cfg.icon;

  // Format diff for display
  const diffEntries = log.diff ? Object.entries(log.diff) : [];

  return (
    <div className="flex flex-col gap-5 p-4">
      <SheetHeader className="p-0">
        <SheetTitle className="text-base">Audit Log Detail</SheetTitle>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
            <SevIcon className="w-3 h-3" /> {cfg.label}
          </span>
          <span className="text-xs font-mono text-foreground bg-muted px-2 py-0.5 rounded">
            {log.action}
          </span>
          {log.flagged && (
            <span className="inline-flex items-center gap-1 text-xs text-red-600">
              <Flag className="w-3 h-3 fill-current" /> Flagged
            </span>
          )}
        </div>
      </SheetHeader>

      {/* Timestamp */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4 shrink-0" />
        <span>{formatDateTime(log.created_at)}</span>
      </div>

      {/* Actor card */}
      <div className="rounded-xl border border-border p-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Actor</p>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#0F6E56]/10 text-[#0F6E56] text-sm font-bold flex items-center justify-center">
            {log.actor_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{log.actor_name}</p>
            <p className="text-xs text-muted-foreground">{log.actor_role}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs font-medium text-foreground">{log.actor_mda}</p>
            <p className="text-[10px] text-muted-foreground">MDA</p>
          </div>
        </div>
      </div>

      {/* Entity */}
      <div className="rounded-xl border border-border p-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Entity</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{log.entity_type}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground">ID</p>
            <p className="font-mono text-xs truncate">{log.entity_id}</p>
          </div>
        </div>
      </div>

      {/* Diff */}
      {diffEntries.length > 0 && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Changes</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="font-semibold text-muted-foreground">Field</div>
            <div className="font-semibold text-muted-foreground">New Value</div>
            {diffEntries.map(([key, value]) => (
              <>
                <div key={`k-${key}`} className="font-medium text-foreground">{key}</div>
                <div key={`v-${key}`} className="font-mono break-all text-foreground/80">
                  {typeof value === 'string'
                    ? value.length > 80 ? value.slice(0, 80) + '…' : value
                    : JSON.stringify(value)}
                </div>
              </>
            ))}
          </div>
        </div>
      )}

      {/* Network metadata */}
      {(log.ip_address || log.user_agent) && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Network</p>
          <div className="space-y-2 text-xs">
            {log.ip_address && (
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono">{log.ip_address}</span>
              </div>
            )}
            {log.user_agent && (
              <div className="flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground break-all">{log.user_agent}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full JSON */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium py-1">
          Raw JSON
        </summary>
        <pre className="mt-2 bg-muted/50 rounded-lg p-3 overflow-auto text-[10px] font-mono leading-relaxed">
          {JSON.stringify({ action: log.action, entity_type: log.entity_type, entity_id: log.entity_id, diff: log.diff, severity: log.severity, created_at: log.created_at }, null, 2)}
        </pre>
      </details>

      {/* Flag action */}
      {onFlag && (
        <Button
          variant={log.flagged ? 'destructive' : 'outline'}
          size="sm"
          className="gap-2 mt-auto"
          onClick={() => onFlag(log.id, log.flagged)}
        >
          <Flag className={cn('w-3.5 h-3.5', log.flagged && 'fill-current')} />
          {log.flagged ? 'Remove Flag' : 'Flag for Review'}
        </Button>
      )}
    </div>
  );
}
