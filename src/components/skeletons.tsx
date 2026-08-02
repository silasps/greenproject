import { Skeleton } from "@/components/ui/skeleton";

export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-lg">
      <Skeleton className="h-4 w-16" />
      <div className="mt-2 flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between border-b border-neutral-100 py-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KpiGridSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-3 h-4 w-96" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormPageSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="mx-auto max-w-lg">
      <Skeleton className="h-8 w-56" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}
