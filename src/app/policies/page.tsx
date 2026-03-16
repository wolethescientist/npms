'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { policies as mockPolicies, getMDA, getProfile } from '@/lib/mock-data';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FilePlus, Search, ArrowRight, Calendar, Building2, GitBranch,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Policy, Profile } from '@/lib/types/database.types';

export default function PoliciesListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [supabasePolicies, setSupabasePolicies] = useState<Policy[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('demo_user');
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  // Fetch real policies from Supabase to supplement mock data
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('policies')
      .select('*')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          // Only keep rows that aren't already in mock data
          const mockIds = new Set(mockPolicies.map((p) => p.id));
          setSupabasePolicies((data as Policy[]).filter((p) => !mockIds.has(p.id)));
        }
      });
  }, []);

  const allPolicies = useMemo(
    () => [...supabasePolicies, ...mockPolicies],
    [supabasePolicies]
  );

  const filtered = useMemo(() => {
    return allPolicies
      .filter((p) => {
        const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [allPolicies, search, statusFilter]);

  // Policies owned by current user that are awaiting action
  const mySubmissions = useMemo(() => {
    if (!currentUser) return [];
    return allPolicies.filter(
      (p) => p.owner_id === currentUser.id && p.status === 'in_review'
    );
  }, [allPolicies, currentUser]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Policies</h1>
          <p className="text-sm text-muted-foreground">Browse, create, and manage national policy documents</p>
        </div>
        <Button asChild className="bg-[#0F6E56] hover:bg-[#085041] shadow-lg shadow-[#0F6E56]/20">
          <Link href="/policies/new">
            <FilePlus className="w-4 h-4 mr-2" /> New Policy
          </Link>
        </Button>
      </div>

      {/* My Submissions banner — shown to policy officers with in_review policies */}
      {mySubmissions.length > 0 && (
        <div className="rounded-xl border border-[#0F6E56]/25 bg-[#0F6E56]/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="w-4 h-4 text-[#0F6E56]" />
            <p className="text-sm font-semibold text-[#0F6E56]">
              Your submissions in review ({mySubmissions.length})
            </p>
          </div>
          <div className="space-y-2">
            {mySubmissions.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border border-[#0F6E56]/15 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">Awaiting approver action · v{p.version}</p>
                </div>
                <Link href={`/policies/${p.id}?tab=workflow`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-[#0F6E56]/30 text-[#0F6E56] hover:bg-[#0F6E56]/10 ml-3 shrink-0">
                    Track Workflow <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No policies found"
          description="Try adjusting your search or filters, or create a new policy."
          actionLabel="Create Policy"
          actionHref="/policies/new"
        />
      ) : (
        <div className="space-y-3 stagger-children">
          {filtered.map((policy) => {
            const mda = getMDA(policy.mda_id);
            const owner = getProfile(policy.owner_id);
            const isInReview = policy.status === 'in_review';

            return (
              <Link
                key={policy.id}
                href={isInReview ? `/policies/${policy.id}?tab=workflow` : `/policies/${policy.id}`}
              >
                <Card className="hover:shadow-md transition-all duration-200 hover:border-[#0F6E56]/30 cursor-pointer group">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-[#0F6E56] transition-colors">
                            {policy.title}
                          </h3>
                          <StatusBadge status={policy.status} />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {mda?.code || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(policy.updated_at)}
                          </span>
                          <span>v{policy.version}</span>
                          {owner && <span>by {owner.full_name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isInReview && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 hidden sm:block">
                            View Workflow
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#0F6E56] transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
