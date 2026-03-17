'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { policies, getMDA, getProfile } from '@/lib/mock-data';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2,
  Search,
  Calendar,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function PublicPortalPage() {
  const [search, setSearch] = useState('');

  // Only show published policies
  const publishedPolicies = useMemo(() => {
    return policies
      .filter((p) => p.status === 'published')
      .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.published_at || b.updated_at).getTime() - new Date(a.published_at || a.updated_at).getTime());
  }, [search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E1F5EE] via-white to-[#E1F5EE]">
      {/* Header */}
      <header className="border-b border-[#0F6E56]/10 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image src="/nigeria-coa.png" alt="Nigeria Coat of Arms" width={40} height={40} className="object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-[#085041] tracking-tight">Public Policy Portal</h1>
              <p className="text-[10px] text-[#0F6E56]/70 -mt-0.5">Published National Policies</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-[#0F6E56]">
              <Link href="/">Home</Link>
            </Button>
            <Button asChild className="bg-[#0F6E56] hover:bg-[#085041]">
              <Link href="/login">Staff Login</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#085041] mb-2">Published National Policies</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Browse officially published policies from Nigerian government Ministries, Departments, and Agencies.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search published policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Results */}
        {publishedPolicies.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No published policies found matching your search.</p>
          </div>
        ) : (
          <div className="space-y-4 stagger-children">
            {publishedPolicies.map((policy) => {
              const mda = getMDA(policy.mda_id);
              const owner = getProfile(policy.owner_id);
              return (
                <Card key={policy.id} className="hover:shadow-lg transition-all duration-200 group cursor-pointer">
                  <CardContent className="py-5 px-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#0F6E56]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-5 h-5 text-[#0F6E56]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground group-hover:text-[#0F6E56] transition-colors mb-1">
                          {policy.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {mda?.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Published {formatDate(policy.published_at || policy.updated_at)}
                          </span>
                          <span>Version {policy.version}</span>
                        </div>
                        <div
                          className="text-sm text-foreground/70 line-clamp-2"
                          dangerouslySetInnerHTML={{
                            __html: policy.body
                              ? policy.body.replace(/<[^>]+>/g, ' ').slice(0, 200) + '…'
                              : 'No content available.',
                          }}
                        />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-[#0F6E56] transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#0F6E56]/10 bg-white/60 py-6 mt-20">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-[#0F6E56]/50">
          © 2025 Federal Republic of Nigeria — National Policy Management System
        </div>
      </footer>
    </div>
  );
}
