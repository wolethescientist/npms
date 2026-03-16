import { PolicyCardSkeleton } from '@/components/repository/PolicyCardSkeleton';

export default function RepositoryLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="h-10 w-full bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <PolicyCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
