import { Skeleton } from '@/components/ui/skeleton';

export default function RepositoryDetailLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[500px] w-full rounded-xl" />
    </div>
  );
}
