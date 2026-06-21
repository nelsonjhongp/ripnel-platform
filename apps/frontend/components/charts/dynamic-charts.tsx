import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

function ChartSkeleton({ height }: { height?: number | string }) {
  return (
    <div className="flex items-center justify-center p-4" style={{ height: typeof height === "number" ? height : 240 }}>
      <Skeleton className="h-full w-full rounded-xl" />
    </div>
  )
}

export const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

export const BarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart),
  { ssr: false }
)

export const PieChart = dynamic(
  () => import("recharts").then((m) => m.PieChart),
  { ssr: false }
)
