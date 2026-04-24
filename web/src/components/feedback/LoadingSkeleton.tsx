import { Skeleton } from "@/components/ui/skeleton";

type SkeletonVariant = "page" | "rows" | "form" | "vacancy-card" | "table" | "dashboard" | "chat";

export function LoadingSkeleton({ variant = "rows" }: { variant?: SkeletonVariant }) {
  if (variant === "vacancy-card") return <VacancyCardSkeleton />;
  if (variant === "form") return <FormSkeleton />;
  if (variant === "table") return <TableSkeleton />;
  if (variant === "dashboard" || variant === "page") return <DashboardSkeleton />;
  if (variant === "chat") return <ChatSkeleton />;

  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card p-3">
          <Skeleton className="h-4 w-2/5 rounded-md" />
          <Skeleton className="mt-3 h-3 w-4/5 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function VacancyCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-5 w-3/4 rounded-md" />
          <Skeleton className="mt-3 h-4 w-1/3 rounded-md" />
          <Skeleton className="mt-2 h-4 w-1/2 rounded-md" />
        </div>
        <Skeleton className="size-10 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-14 w-full rounded-md" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-4 p-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="mt-3 h-10 w-full rounded-md" />
          <Skeleton className="mt-2 h-3 w-2/3 rounded-md" />
        </div>
      ))}
      <Skeleton className="h-10 w-36 rounded-md" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card p-3">
      <div className="grid grid-cols-4 gap-3 border-b pb-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-4 rounded-md" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-4 gap-3 border-b py-3 last:border-b-0">
          <Skeleton className="h-5 rounded-md" />
          <Skeleton className="h-5 rounded-md" />
          <Skeleton className="h-5 rounded-md" />
          <Skeleton className="h-5 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border bg-card p-4">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="mt-4 h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <VacancyCardSkeleton />
        <div className="rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="mt-4 h-24 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="h-5 w-36 rounded-md" />
        <Skeleton className="mt-4 h-36 w-full rounded-md" />
        <Skeleton className="mt-4 h-24 w-full rounded-md" />
      </div>
      <VacancyCardSkeleton />
    </div>
  );
}
