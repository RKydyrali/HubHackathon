import { Skeleton } from "@/components/ui/skeleton";

export function AiChatSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-3/4 rounded-lg" />
        <Skeleton className="h-12 w-2/3 self-end rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    </div>
  );
}
