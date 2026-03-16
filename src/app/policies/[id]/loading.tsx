import { Skeleton } from '@/components/ui/skeleton';

export default function PolicyDetailLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}
