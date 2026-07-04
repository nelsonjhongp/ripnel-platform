import * as React from "react"

import { opsControlClassName } from "@/components/ui/ops-control-styles"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-w-0 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--ops-text)]",
        opsControlClassName,
        className
      )}
      {...props}
    />
  )
}

export { Input }
