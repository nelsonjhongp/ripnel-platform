"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { exportToCsv } from "@/lib/export-csv"

export function ExportCsvButton({
  filename,
  headers,
  rows,
  disabled,
}: {
  filename: string
  headers: string[]
  rows: string[][]
  disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-lg"
          onClick={() => exportToCsv(filename, headers, rows)}
          disabled={disabled || rows.length === 0}
          aria-label="Exportar CSV"
        >
          <Download className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        Exportar CSV
      </TooltipContent>
    </Tooltip>
  )
}
