'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { Calendar, ArrowRight } from 'lucide-react';

interface PolicyCardProps {
  id: string;
  title: string;
  status: string;
  mdaName: string;
  sector: string | null;
  policyType: string | null;
  version: number;
  updatedAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  act:         'bg-purple-50 text-purple-700 border-purple-200',
  regulation:  'bg-blue-50 text-blue-700 border-blue-200',
  guideline:   'bg-cyan-50 text-cyan-700 border-cyan-200',
  framework:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  circular:    'bg-amber-50 text-amber-700 border-amber-200',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function PolicyCard({
  id, title, status, mdaName, sector, policyType, version, updatedAt,
}: PolicyCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md hover:border-[#0F6E56]/30 transition-all duration-200 group">
      <CardContent className="p-5 space-y-3">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-[#0F6E56] transition-colors line-clamp-2">
            {title}
          </h3>
          <div className="shrink-0">
            <StatusBadge status={status} />
          </div>
        </div>

        {/* MDA */}
        <p className="text-xs text-muted-foreground font-medium">{mdaName}</p>

        {/* Chips row */}
        <div className="flex flex-wrap gap-1.5">
          {sector && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0F6E56]/10 text-[#0F6E56] border border-[#0F6E56]/20">
              {sector}
            </span>
          )}
          {policyType && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${TYPE_COLORS[policyType] ?? 'bg-muted text-muted-foreground border-border'}`}>
              {policyType}
            </span>
          )}
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            v{version}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {formatDate(updatedAt)}
          </span>
          <Link href={`/repository/${id}`}>
            <Button size="sm" variant="outline" className="h-7 text-xs hover:border-[#0F6E56]/40 hover:text-[#0F6E56]">
              View <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
