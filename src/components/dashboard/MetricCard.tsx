import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricCardProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  loading?: boolean
  className?: string
}

export function MetricCard({ label, value, sub, loading, className }: MetricCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-9 w-32" />
          <Skeleton className="mt-1 h-3 w-24" />
        </>
      ) : (
        <>
          <div className="mt-2 text-3xl font-bold font-mono">{value}</div>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </>
      )}
    </div>
  )
}
