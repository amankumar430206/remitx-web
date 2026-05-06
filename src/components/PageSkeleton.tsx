import { cn } from '@/lib/utils'

function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* PageHeader */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Bone className="h-3 w-28" />
          <Bone className="h-7 w-44" />
        </div>
        <Bone className="h-9 w-24 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Bone className="h-9 w-56 rounded-lg" />
        <Bone className="h-9 w-32 rounded-lg" />
      </div>

      {/* Content card */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
          <Bone className="h-4 w-1/4" />
          <Bone className="h-4 w-1/5" />
          <Bone className="h-4 w-1/6" />
          <Bone className="h-4 w-1/6" />
          <Bone className="h-4 w-16 ml-auto" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
            <Bone className="h-4 w-1/4" />
            <Bone className="h-4 w-1/5" />
            <Bone className="h-4 w-1/6" />
            <Bone className="h-4 w-1/6" />
            <Bone className="h-6 w-16 ml-auto rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
