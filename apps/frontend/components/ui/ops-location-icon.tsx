"use client"

import { Building2, Store, Warehouse } from "lucide-react"
import { cn } from "@/lib/utils"

type OpsLocationIconProps = {
  type?: string | null
  className?: string
}

export function OpsLocationIcon({
  type,
  className,
}: OpsLocationIconProps) {
  if (type === "store") {
    return <Store className={className} />
  }

  if (type === "warehouse") {
    return <Warehouse className={className} />
  }

  return <Building2 className={className} />
}
