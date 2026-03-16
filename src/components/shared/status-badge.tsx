'use client';

import { Badge } from '@/components/ui/badge';
import { cn, getStatusColor, formatStatusLabel } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-semibold border px-2.5 py-0.5 capitalize',
        getStatusColor(status),
        className
      )}
    >
      {formatStatusLabel(status)}
    </Badge>
  );
}
