"use client"

import {
  OpsMetricCard,
  type OpsMetricCardProps,
} from "@/components/ui/ops-metric-card"

export interface HomeKpiCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  detail?: string
  state?: string
  tone?: "default" | "accent" | "success" | "warning" | "danger" | "neutral"
  href?: string
}

export function HomeKpiCard(props: HomeKpiCardProps) {
  return <OpsMetricCard {...(props satisfies OpsMetricCardProps)} />
}
