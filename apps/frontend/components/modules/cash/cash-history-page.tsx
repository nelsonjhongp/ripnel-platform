"use client"

import Link from "next/link"
import { RotateCcw, RotateCw } from "lucide-react"

import { Pagination } from "@/components/ui/pagination"
import {
  OpsPageShell,
  OpsFiltersRow,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell"
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection"
import { Button } from "@/components/ui/button"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { AdminActionButton } from "@/components/admin/admin-ui"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { LoadingPage } from "@/components/feedback/status-page"
import { DateFilterPicker } from "@/components/ui/date-filter-picker"
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

import { formatAmount, formatBusinessDate } from "./cash-utils"
import { formatDateTime } from "@/lib/date-utils"
import { CashStatusBadge } from "./cash-status-badge"
import { CAJA } from "./cash-messages"
import { HISTORY_TABLE_COLUMNS } from "./cash-constants"
import { useCashHistory } from "./use-cash-history"

const STATUS_OPTIONS: OpsOption[] = [
  { value: "all", label: CAJA.admin.statusOptions.all },
  { value: "open", label: CAJA.admin.statusOptions.pending },
  { value: "closed", label: CAJA.admin.statusOptions.closed },
]

export default function CashHistoryPage() {
  const {
    status,
    setStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    setPage,
    items,
    pagination,
    loading,
    error,
    hasActiveFilters,
    clearFilters,
    refetch,
    data,
  } = useCashHistory()

  if (loading && !data) {
    return (
      <LoadingPage
        title={CAJA.loading.history.title}
        description={CAJA.loading.history.desc}
        variant="ops"
      />
    )
  }

  return (
    <PermissionGuard anyPermissions={["cash.view", "cash.operate"]}>
      <TooltipProvider delayDuration={120}>
        <OpsPageShell width="wide">
          <PosHeader
            eyebrow={CAJA.header.eyebrow}
            title={CAJA.header.historyTitle}
            actions={
              <AdminActionButton onClick={refetch}>
                <RotateCw className="h-4 w-4" />
                {CAJA.actions.update}
              </AdminActionButton>
            }
          />

          <OpsTableBlock className="border-t border-[var(--ops-border-strong)] pt-4">
            <OpsFiltersRow className="lg:grid-cols-[1fr_0.95fr_0.95fr_auto]">
              <OpsSelect
                label={CAJA.admin.filters.status}
                value={status}
                options={STATUS_OPTIONS}
                onChange={(v) => {
                  setStatus(v as Parameters<typeof setStatus>[0])
                  setPage(1)
                }}
              />

              <DateFilterPicker
                label={CAJA.history.filters.dateFrom}
                value={dateFrom}
                onChange={(value) => {
                  setDateFrom(value)
                  setPage(1)
                }}
                ariaLabel={CAJA.history.filters.dateFromAria}
                max={dateTo || undefined}
                density="compact"
              />

              <DateFilterPicker
                label={CAJA.history.filters.dateTo}
                value={dateTo}
                onChange={(value) => {
                  setDateTo(value)
                  setPage(1)
                }}
                ariaLabel={CAJA.history.filters.dateToAria}
                min={dateFrom || undefined}
                density="compact"
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="h-10 w-10 rounded-lg"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    aria-label={CAJA.admin.filters.clearFilters}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{CAJA.admin.filters.clearFilters}</TooltipContent>
              </Tooltip>
            </OpsFiltersRow>

            <OpsDataTable
              columns={HISTORY_TABLE_COLUMNS}
              minWidth="860px"
              loading={loading}
              error={error}
              errorTitle={CAJA.history.table.error}
              isEmpty={items.length === 0}
              emptyMessage={CAJA.history.noResults}
              footer={
                pagination && pagination.total_items > 0 ? (
                  <>
                    <span className="text-sm text-[var(--ops-text-muted)]">
                      {(pagination.page - 1) * pagination.page_size + 1}-
                      {Math.min(
                        pagination.page * pagination.page_size,
                        pagination.total_items,
                      )}{" "}
                      de {pagination.total_items}
                    </span>
                    <Pagination
                      page={pagination.page}
                      totalPages={pagination.total_pages}
                      onPageChange={setPage}
                    />
                  </>
                ) : undefined
              }
            >
              {items.map((closing) => (
                <tr
                  key={closing.cash_closing_id}
                  className="text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                >
                  <td className="px-4 py-[var(--ops-row-py)] text-sm font-medium text-[var(--ops-text)]">
                    {formatBusinessDate(closing.business_date)}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] text-[var(--ops-text-muted)]">
                    <span className="font-medium text-[var(--ops-text)]">
                      {closing.opened_by_name || CAJA.fallback.dash}
                    </span>
                    <span className="ml-2 text-xs">
                      {formatDateTime(closing.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    {closing.closed_at ? (
                      <span className="text-[var(--ops-text-muted)]">
                        <span className="font-medium text-[var(--ops-text)]">
                          {closing.closed_by_name || CAJA.fallback.dash}
                        </span>
                        <span className="ml-2 text-xs">
                          {formatDateTime(closing.closed_at)}
                        </span>
                      </span>
                    ) : (
                      <CashStatusBadge status={closing.status} />
                    )}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <p className="font-semibold">
                      {formatAmount(closing.total_all)}
                    </p>
                    {closing.is_consistent === false ? (
                      <p className="text-xs text-[var(--ops-tone-warning-text)]">
                        {CAJA.history.diffLabel} {formatAmount(closing.difference)}
                      </p>
                    ) : closing.status === "closed" ? (
                      <p className="text-xs text-[var(--ops-tone-success-text)]">
                        {CAJA.history.ok}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-lg px-3"
                      >
                        <Link href={`/caja/historial/${closing.cash_closing_id}`}>
                          {CAJA.actions.view}
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </OpsDataTable>
          </OpsTableBlock>
        </OpsPageShell>
      </TooltipProvider>
    </PermissionGuard>
  )
}
