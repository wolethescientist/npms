'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/status-badge';
import { PolicyCard } from '@/components/repository/PolicyCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Download, Share2, FileText, History,
  Users, Loader2, Calendar, Building2, User,
} from 'lucide-react';
import { mdas, getProfile } from '@/lib/mock-data';
import type { PolicyWithRepositoryFields, PolicyVersion } from '@/lib/types/database.types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getMDAName(mdaId: string) {
  return mdas.find((m) => m.id === mdaId)?.name ?? 'Unknown MDA';
}

export default function RepositoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [policy, setPolicy] = useState<PolicyWithRepositoryFields | null>(null);
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [related, setRelated] = useState<PolicyWithRepositoryFields[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();

    const { data: pol } = await supabase
      .from('policies')
      .select('*')
      .eq('id', id)
      .single();

    if (!pol) { setLoading(false); return; }
    setPolicy(pol as PolicyWithRepositoryFields);

    // Version history
    const { data: versionData } = await supabase
      .from('policy_versions')
      .select('*')
      .eq('policy_id', id)
      .order('version', { ascending: false });
    setVersions((versionData ?? []) as PolicyVersion[]);

    // Related policies (same MDA or sector, limit 4)
    const { data: rel } = await supabase
      .from('policies')
      .select('*')
      .neq('id', id)
      .or(`mda_id.eq.${pol.mda_id},sector.eq.${pol.sector ?? 'NONE'}`)
      .eq('status', 'published')
      .limit(4);
    setRelated((rel ?? []) as PolicyWithRepositoryFields[]);

    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[#0F6E56]" />
      </div>
    );
  }

  if (!policy) { notFound(); }

  const owner = getProfile(policy.owner_id);

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* Back */}
      <div className="print:hidden">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/repository"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Repository</Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{policy.title}</h1>
            <StatusBadge status={policy.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{getMDAName(policy.mda_id)}</span>
            {owner && <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{owner.full_name}</span>}
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Updated {formatDate(policy.updated_at)}</span>
            <Badge variant="secondary" className="text-xs">v{policy.version}</Badge>
            {policy.sector && <Badge variant="outline" className="text-xs">{policy.sector}</Badge>}
            {policy.policy_type && <Badge variant="outline" className="text-xs capitalize">{policy.policy_type}</Badge>}
          </div>
        </div>

        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="w-4 h-4" /> Share
          </Button>
          {policy.attachment_url && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <a href={policy.attachment_url} download target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4" /> Download
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      {/* Tags */}
      {policy.tags && policy.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {policy.tags.map((tag) => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-[#0F6E56]/10 text-[#0F6E56] border border-[#0F6E56]/20 font-medium">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <Tabs defaultValue="document">
        <TabsList className="bg-muted/50 print:hidden">
          <TabsTrigger value="document" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> Document</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs"><History className="w-3.5 h-3.5" /> Version History</TabsTrigger>
          {related.length > 0 && (
            <TabsTrigger value="related" className="gap-1.5 text-xs"><Users className="w-3.5 h-3.5" /> Related</TabsTrigger>
          )}
        </TabsList>

        {/* Document */}
        <TabsContent value="document">
          <Card className="print:border-none print:shadow-none">
            <CardContent className="pt-6">
              <div
                className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80"
                dangerouslySetInnerHTML={{ __html: policy.body ?? '<p class="text-muted-foreground italic">No content available.</p>' }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Version History */}
        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Version History</CardTitle></CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No version history recorded yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Current version: v{policy.version}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        {['Version', 'Changed By', 'Summary', 'Date'].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {versions.map((v) => {
                        const author = v.changed_by ? getProfile(v.changed_by) : null;
                        return (
                          <tr key={v.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-semibold">v{v.version}</td>
                            <td className="px-4 py-3 text-muted-foreground">{author?.full_name ?? 'Unknown'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{v.summary ?? '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(v.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related */}
        {related.length > 0 && (
          <TabsContent value="related">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {related.map((p) => (
                <PolicyCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  status={p.status}
                  mdaName={getMDAName(p.mda_id)}
                  sector={p.sector}
                  policyType={p.policy_type}
                  version={p.version}
                  updatedAt={p.updated_at}
                />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
