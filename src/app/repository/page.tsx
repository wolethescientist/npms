'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PolicyCard } from '@/components/repository/PolicyCard';
import { PolicyCardSkeleton } from '@/components/repository/PolicyCardSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Search, LayoutGrid, List, SlidersHorizontal, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { mdas } from '@/lib/mock-data';
import type { PolicyWithRepositoryFields } from '@/lib/types/database.types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const STATUSES = ['draft', 'in_review', 'approved', 'published', 'rejected'];
const SECTORS = ['Health', 'Education', 'Finance', 'Agriculture', 'Infrastructure', 'Technology', 'Environment', 'Energy'];
const POLICY_TYPES = ['act', 'regulation', 'guideline', 'framework', 'circular'];
const SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Recently Updated' },
  { value: 'created_desc', label: 'Newest' },
  { value: 'created_asc',  label: 'Oldest' },
  { value: 'title_asc',    label: 'Title A–Z' },
];

interface Filters {
  statuses: string[];
  mdaIds: string[];
  sector: string;
  policyType: string;
  dateFrom: string;
  dateTo: string;
  tags: string;
}

const defaultFilters: Filters = {
  statuses: [], mdaIds: [], sector: '', policyType: '',
  dateFrom: '', dateTo: '', tags: '',
};

// Simple inline diff renderer (no external library needed for word-level)
function computeWordDiff(oldText: string, newText: string) {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  // LCS-based diff
  const m = oldWords.length, n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oldWords[i-1] === newWords[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);

  const result: { text: string; type: 'same' | 'add' | 'del' }[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i-1] === newWords[j-1]) {
      result.unshift({ text: oldWords[i-1], type: 'same' }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.unshift({ text: newWords[j-1], type: 'add' }); j--;
    } else {
      result.unshift({ text: oldWords[i-1], type: 'del' }); i--;
    }
  }
  return result;
}

function DiffView({ oldBody, newBody }: { oldBody: string; newBody: string }) {
  const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const diff = computeWordDiff(plain(oldBody), plain(newBody));
  return (
    <p className="text-sm leading-relaxed font-mono whitespace-pre-wrap">
      {diff.map((d, i) => (
        <span
          key={i}
          className={
            d.type === 'add' ? 'bg-emerald-100 text-emerald-800' :
            d.type === 'del' ? 'bg-red-100 text-red-700 line-through' :
            ''
          }
        >
          {d.text}
        </span>
      ))}
    </p>
  );
}

function getMDAName(mdaId: string) {
  return mdas.find((m) => m.id === mdaId)?.name ?? 'Unknown MDA';
}

export default function RepositoryPage() {
  const [policies, setPolicies] = useState<PolicyWithRepositoryFields[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('updated_desc');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(true);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparePolicies, setComparePolicies] = useState<[PolicyWithRepositoryFields | null, PolicyWithRepositoryFields | null]>([null, null]);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('policies')
      .select('*', { count: 'exact' })
      .eq('is_archived', false);

    // Full-text search
    if (search.trim()) {
      query = query.textSearch('fts', search.trim(), { type: 'websearch' });
    }

    // Status filter
    if (filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    }

    // MDA filter
    if (filters.mdaIds.length > 0) {
      query = query.in('mda_id', filters.mdaIds);
    }

    // Sector
    if (filters.sector) {
      query = query.eq('sector', filters.sector);
    }

    // Policy type
    if (filters.policyType) {
      query = query.eq('policy_type', filters.policyType);
    }

    // Date range
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo + 'T23:59:59Z');
    }

    // Sort
    const sortMap: Record<string, { col: string; asc: boolean }> = {
      updated_desc: { col: 'updated_at', asc: false },
      created_desc: { col: 'created_at', asc: false },
      created_asc:  { col: 'created_at', asc: true },
      title_asc:    { col: 'title',      asc: true },
    };
    const s = sortMap[sort] ?? sortMap.updated_desc;
    query = query.order(s.col, { ascending: s.asc });

    // Pagination
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;

    if (!error && data) {
      setPolicies(data as PolicyWithRepositoryFields[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [search, filters, sort, page]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const activeFilterCount =
    filters.statuses.length + filters.mdaIds.length +
    (filters.sector ? 1 : 0) + (filters.policyType ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  const toggleStatus = (s: string) =>
    setFilters((f) => ({
      ...f,
      statuses: f.statuses.includes(s) ? f.statuses.filter((x) => x !== s) : [...f.statuses, s],
    }));

  const toggleMDA = (id: string) =>
    setFilters((f) => ({
      ...f,
      mdaIds: f.mdaIds.includes(id) ? f.mdaIds.filter((x) => x !== id) : [...f.mdaIds, id],
    }));

  const clearFilters = () => { setFilters(defaultFilters); setPage(0); };

  const openCompare = (policy: PolicyWithRepositoryFields) => {
    setComparePolicies([policy, null]);
    setCompareOpen(true);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Policy Repository</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount > 0 ? `${totalCount} polic${totalCount === 1 ? 'y' : 'ies'} found` : 'Search and browse all national policies'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={view === 'grid' ? 'default' : 'outline'}
            className={cn('h-8 w-8 p-0', view === 'grid' && 'bg-[#0F6E56] hover:bg-[#085041]')}
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={view === 'table' ? 'default' : 'outline'}
            className={cn('h-8 w-8 p-0', view === 'table' && 'bg-[#0F6E56] hover:bg-[#085041]')}
            onClick={() => setView('table')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search + sort bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search policies by title or content..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <Select value={sort} onValueChange={(v: string | null) => { if (v) { setSort(v); setPage(0); } }}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="bg-[#0F6E56] text-white text-[10px] px-1.5 py-0 h-4">{activeFilterCount}</Badge>
          )}
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Filter sidebar */}
        {showFilters && (
          <aside className="w-60 shrink-0 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-[#0F6E56] hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>

            {/* Status */}
            <div>
              <p className="text-xs font-semibold mb-2 text-foreground">Status</p>
              <div className="space-y-1.5">
                {STATUSES.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${s}`}
                      checked={filters.statuses.includes(s)}
                      onCheckedChange={() => { toggleStatus(s); setPage(0); }}
                    />
                    <Label htmlFor={`status-${s}`} className="text-xs capitalize cursor-pointer">
                      {s.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* MDA */}
            <div>
              <p className="text-xs font-semibold mb-2 text-foreground">Ministry / Agency</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {mdas.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`mda-${m.id}`}
                      checked={filters.mdaIds.includes(m.id)}
                      onCheckedChange={() => { toggleMDA(m.id); setPage(0); }}
                    />
                    <Label htmlFor={`mda-${m.id}`} className="text-xs cursor-pointer">{m.code}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Sector */}
            <div>
              <p className="text-xs font-semibold mb-2 text-foreground">Sector</p>
              <Select value={filters.sector || '_all'} onValueChange={(v: string | null) => { if (v !== null) { setFilters((f) => ({ ...f, sector: v === '_all' ? '' : v })); setPage(0); } }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All sectors</SelectItem>
                  {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Policy Type */}
            <div>
              <p className="text-xs font-semibold mb-2 text-foreground">Policy Type</p>
              <Select value={filters.policyType || '_all'} onValueChange={(v: string | null) => { if (v !== null) { setFilters((f) => ({ ...f, policyType: v === '_all' ? '' : v })); setPage(0); } }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All types</SelectItem>
                  {POLICY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div>
              <p className="text-xs font-semibold mb-2 text-foreground">Date Created</p>
              <div className="space-y-2">
                <Input type="date" className="h-8 text-xs" value={filters.dateFrom}
                  onChange={(e) => { setFilters((f) => ({ ...f, dateFrom: e.target.value })); setPage(0); }} />
                <Input type="date" className="h-8 text-xs" value={filters.dateTo}
                  onChange={(e) => { setFilters((f) => ({ ...f, dateTo: e.target.value })); setPage(0); }} />
              </div>
            </div>
          </aside>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {loading ? (
            <div className={cn(
              'grid gap-4',
              view === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'
            )}>
              {Array.from({ length: 6 }).map((_, i) => <PolicyCardSkeleton key={i} />)}
            </div>
          ) : policies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">No policies found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button>
              )}
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {policies.map((p) => (
                <div key={p.id} className="relative">
                  <PolicyCard
                    id={p.id}
                    title={p.title}
                    status={p.status}
                    mdaName={getMDAName(p.mda_id)}
                    sector={p.sector}
                    policyType={p.policy_type}
                    version={p.version}
                    updatedAt={p.updated_at}
                  />
                  <button
                    onClick={() => openCompare(p)}
                    className="absolute top-3 right-3 text-[10px] text-muted-foreground hover:text-[#0F6E56] hover:underline"
                  >
                    Compare
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Table view */
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {['Title', 'MDA', 'Sector', 'Type', 'Status', 'Version', 'Updated', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {policies.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground max-w-[280px] truncate">{p.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{getMDAName(p.mda_id).split(' ').map(w => w[0]).join('')}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.sector ?? '—'}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{p.policy_type ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          p.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          p.status === 'approved'  ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          p.status === 'in_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          p.status === 'rejected'  ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-muted text-muted-foreground border-border'
                        }`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">v{p.version}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(p.updated_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/repository/${p.id}`} className="text-[#0F6E56] hover:underline font-medium">View →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs flex items-center px-3 border rounded-md">
                  {page + 1} / {totalPages}
                </span>
                <Button size="sm" variant="outline" className="h-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compare versions modal */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare Versions</DialogTitle>
          </DialogHeader>
          {comparePolicies[0] && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Comparing <strong>{comparePolicies[0].title}</strong> — select another policy to diff against, or view the current version.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">CURRENT VERSION (v{comparePolicies[0].version})</p>
                  <div className="border rounded-lg p-3 text-xs bg-muted/20 max-h-[400px] overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: comparePolicies[0].body ?? '<em>No content</em>' }} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">SELECT VERSION TO COMPARE</p>
                  <Select onValueChange={(id) => {
                    const found = policies.find(p => p.id === id);
                    if (found) setComparePolicies([comparePolicies[0], found]);
                  }}>
                    <SelectTrigger className="h-8 text-xs mb-2">
                      <SelectValue placeholder="Select a policy version..." />
                    </SelectTrigger>
                    <SelectContent>
                      {policies.filter(p => p.id !== comparePolicies[0]?.id).map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.title} (v{p.version})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {comparePolicies[1] && (
                    <div className="border rounded-lg p-3 text-xs bg-muted/20 max-h-[360px] overflow-y-auto">
                      <DiffView
                        oldBody={comparePolicies[0]?.body ?? ''}
                        newBody={comparePolicies[1]?.body ?? ''}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
