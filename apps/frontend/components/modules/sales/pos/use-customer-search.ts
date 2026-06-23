"use client"

import { useEffect, useState } from "react"
import { apiFetch, unwrapApiData } from "@/lib/api"
import type { PosCustomer } from "./pos-types"
import {
  filterCustomersByDocumentType,
  getCustomerSearchFilter,
  replaceCustomerInResults,
} from "./pos-customer-utils"

export function useCustomerSearch(documentType: string) {
  const [customerQuery, setCustomerQuery] = useState("")
  const [customerResults, setCustomerResults] = useState<PosCustomer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0)
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null)

  useEffect(() => {
    const normalizedCustomerQuery = customerQuery.trim()
    if (!customerPickerOpen && !normalizedCustomerQuery) {
      void Promise.resolve().then(() => {
        setCustomerResults([])
        setLoadingCustomers(false)
      })
      return
    }

    let active = true
    const timeoutId = window.setTimeout(
      async () => {
        setLoadingCustomers(true)

        try {
          const params = new URLSearchParams()
          if (normalizedCustomerQuery) params.set("q", normalizedCustomerQuery)
          const { queryDocumentType } = getCustomerSearchFilter(documentType)
          if (queryDocumentType) params.set("document_type", queryDocumentType)
          const path = params.toString()
            ? `/api/customers?${params.toString()}`
            : "/api/customers"
          const response = await apiFetch(path)
          const customers = unwrapApiData(response)
          const compatibleCustomers = filterCustomersByDocumentType(
            Array.isArray(customers) ? customers : [],
            documentType,
          ).slice(0, normalizedCustomerQuery ? 12 : 24)

          if (active) setCustomerResults(compatibleCustomers)
        } catch {
          if (active) setCustomerResults([])
        } finally {
          if (active) setLoadingCustomers(false)
        }
      },
      normalizedCustomerQuery ? 250 : 0,
    )

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [customerPickerOpen, customerQuery, documentType])

  useEffect(() => {
    void Promise.resolve().then(() =>
      setHighlightedCustomerIndex((current) =>
        Math.min(Math.max(current, 0), Math.max(customerResults.length - 1, 0)),
      ),
    )
  }, [customerResults.length])

  function selectCustomer(customer: PosCustomer | null) {
    setSelectedCustomer(customer)
    setCustomerQuery("")
    setCustomerResults([])
    setHighlightedCustomerIndex(0)
    setCustomerPickerOpen(false)
  }

  function handleCustomerSaved(customer: PosCustomer) {
    setSelectedCustomer(customer)
    setCustomerResults((current) => replaceCustomerInResults(current, customer))
    setCustomerQuery("")
  }

  return {
    customerQuery,
    setCustomerQuery,
    customerResults,
    loadingCustomers,
    customerPickerOpen,
    setCustomerPickerOpen,
    highlightedCustomerIndex,
    setHighlightedCustomerIndex,
    selectedCustomer,
    setSelectedCustomer,
    selectCustomer,
    handleCustomerSaved,
  }
}
