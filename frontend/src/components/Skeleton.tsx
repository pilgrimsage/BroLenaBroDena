// Props define what the component accepts
interface SkeletonProps {
  className?: string  // ? means optional
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-100 dark:bg-white/5 rounded-xl ${className}`} />
  )
}

// Pre-built skeleton for a friend card row
export function FriendCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  )
}