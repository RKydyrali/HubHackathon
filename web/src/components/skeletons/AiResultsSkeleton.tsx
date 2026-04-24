import { Skeleton } from "@/components/ui/skeleton";

export function AiResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-5 w-40 rounded-md" />
      <Skeleton className="h-44 w-full rounded-lg" />
      <Skeleton className="h-36 w-full rounded-lg" />
      <Skeleton className="h-36 w-full rounded-lg" />
    </div>
  );
}
