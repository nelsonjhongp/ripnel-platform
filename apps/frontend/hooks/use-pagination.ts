import { useState } from "react"
import { PAGE_SIZE } from "@/lib/constants"

type UsePaginationResult<T> = {
  paginatedItems: T[]
  page: number
  totalPages: number
  safePage: number
  firstVisible: number
  lastVisible: number
  total: number
  setPage: (page: number) => void
}

export function usePagination<T>(
  items: T[],
  pageSize: number = PAGE_SIZE
): UsePaginationResult<T> {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginatedItems = items.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  )
  const firstVisible = items.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const lastVisible = Math.min(safePage * pageSize, items.length)

  return {
    paginatedItems,
    page: safePage,
    totalPages,
    safePage,
    firstVisible,
    lastVisible,
    total: items.length,
    setPage,
  }
}
