"use client"

import { AlertTriangle, LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { OpsTableWrap, OpsTableFooter } from "@/components/ui/ops-page-shell"

export type OpsDataTableColumn = {
  key: string
  header: string
  className?: string
}

type OpsDataTableProps = {
  columns: OpsDataTableColumn[]
  minWidth?: string
  loading?: boolean
  loadingMessage?: string
  error?: string | null
  errorTitle?: string
  emptyMessage?: string
  isEmpty?: boolean
  children: React.ReactNode
  footer?: React.ReactNode
}

export function OpsDataTable({
  columns,
  minWidth = "920px",
  loading = false,
  loadingMessage = "Cargando...",
  error = null,
  errorTitle = "Error al cargar",
  emptyMessage = "Sin resultados",
  isEmpty = false,
  children,
  footer,
}: OpsDataTableProps) {
  const colCount = columns.length

  return (
    <OpsTableWrap minWidth={minWidth}>
      <table className="w-full border-collapse">
        <thead className="bg-[var(--ops-surface-muted)]">
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            {columns.map((col) => (
              <th key={col.key} scope="col" className={cn("px-4 py-3", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
          {loading ? (
            <tr>
              <td
                colSpan={colCount}
                className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
              >
                <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin" />
                {loadingMessage}
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td
                colSpan={colCount}
                className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
              >
                <div role="alert" className="inline-flex max-w-xl items-start gap-2 text-left">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ops-tone-danger-text)]" />
                  <span>
                    <span className="block font-semibold text-[var(--ops-text)]">{errorTitle}</span>
                    <span className="mt-0.5 block">{error}</span>
                  </span>
                </div>
              </td>
            </tr>
          ) : isEmpty ? (
            <tr>
              <td
                colSpan={colCount}
                className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
      {footer && <OpsTableFooter>{footer}</OpsTableFooter>}
    </OpsTableWrap>
  )
}
