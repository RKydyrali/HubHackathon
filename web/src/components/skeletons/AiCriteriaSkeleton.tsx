import { Skeleton } from "@/components/ui/skeleton";

export function AiCriteriaSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <Skeleton className="h-5 w-32 rounded-md" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
    </div>
  );
}
