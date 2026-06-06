"use client"

import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function HelpTooltip({ content, side = "top", sideOffset = 8 }: { content: string; side?: "top" | "bottom" | "left" | "right"; sideOffset?: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
          aria-label="Mas informacion"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={sideOffset} className="max-w-72">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
