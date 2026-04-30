"use client"

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  siblingCount?: number
}

type PaginationItem = number | "ellipsis"

function buildPaginationItems(
  page: number,
  totalPages: number,
  siblingCount: number
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const windowStart = Math.max(2, page - siblingCount)
  const windowEnd = Math.min(totalPages - 1, page + siblingCount)
  const items: PaginationItem[] = [1]

  if (windowStart > 2) {
    items.push("ellipsis")
  }

  for (let current = windowStart; current <= windowEnd; current += 1) {
    items.push(current)
  }

  if (windowEnd < totalPages - 1) {
    items.push("ellipsis")
  }

  items.push(totalPages)

  return items
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
  siblingCount = 1,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages)
  const safePage = Math.min(Math.max(1, page), safeTotalPages)
  const items = buildPaginationItems(safePage, safeTotalPages, siblingCount)

  return (
    <nav
      aria-label="Paginacion"
      className={cn("flex flex-wrap items-center justify-end gap-1.5", className)}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, safePage - 1))}
        disabled={safePage <= 1}
        className="rounded-lg px-2.5 text-[13px] text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
        aria-label="Pagina anterior"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Anterior
      </Button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex h-7 min-w-7 items-center justify-center px-1 text-sm font-medium text-[var(--ops-text-muted)]"
            aria-hidden="true"
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            variant={item === safePage ? "accent" : "outline"}
            size="icon-sm"
            onClick={() => onPageChange(item)}
            aria-current={item === safePage ? "page" : undefined}
            aria-label={`Ir a pagina ${item}`}
            className={cn(
              "rounded-lg text-[13px]",
              item === safePage
                ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_42%,transparent)] bg-[var(--ripnel-accent)] text-white hover:bg-[var(--ripnel-accent-hover)]"
                : "text-[var(--ops-text)] hover:text-[var(--ops-text)]"
            )}
          >
            {item}
          </Button>
        )
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
        disabled={safePage >= safeTotalPages}
        className="rounded-lg px-2.5 text-[13px] text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
        aria-label="Pagina siguiente"
      >
        Siguiente
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </nav>
  )
}

export default Pagination
