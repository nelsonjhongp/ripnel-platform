"use client"

import { useCallback, useMemo, useState } from "react"
import { LoaderCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateFilterPicker } from "@/components/ui/date-filter-picker"
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group"
import { OpsSectionDivider, OpsTableBlock, OpsTableWrap } from "@/components/ui/ops-page-shell"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import {
  createPricingRule,
  fetchPricingRules,
  updatePricingRule,
} from "@/lib/api-prices"
import { formatDate } from "@/lib/date-utils";
import type { PricingRuleRow } from "@/lib/prices-types"
import { useApiGet } from "@/hooks/use-api-get"
import { PRICE } from "./pricing-messages"
import { MSG_BOX_SUCCESS, MSG_BOX_ERROR, opsInputCompact, opsFieldLabelClassName } from "./pricing-constants"

function createRuleDraft(rule: PricingRuleRow | null) {
  if (!rule) {
    return {
      minQty: "3",
      active: true,
      validFrom: "",
      validTo: "",
    }
  }

  return {
    minQty: String(rule.min_qty),
    active: rule.active,
    validFrom: rule.valid_from?.slice(0, 10) || "",
    validTo: rule.valid_to?.slice(0, 10) || "",
  }
}

export function PricingRulesPage() {
  const { data: rulesData, loading, refetch } = useApiGet(() => fetchPricingRules(), [])
  const rules = useMemo(() => rulesData ?? [], [rulesData])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState<ReturnType<typeof createRuleDraft> | null>(null)

  const wholesaleRule = useMemo(
    () =>
      rules.find((rule) => rule.rule_type === "WHOLESALE_MIN_QTY_TOTAL") || null,
    [rules]
  )

  const formState = useMemo(
    () => draft ?? createRuleDraft(wholesaleRule),
    [draft, wholesaleRule]
  )

  const updateDraft = useCallback(
    (updater: (current: ReturnType<typeof createRuleDraft>) => ReturnType<typeof createRuleDraft>) => {
      setDraft((current) => updater(current ?? createRuleDraft(wholesaleRule)))
      setSubmitError(null)
      setMessage(null)
    },
    [wholesaleRule]
  )

  const handleRefresh = useCallback(() => {
    setDraft(null)
    setMessage(null)
    refetch()
  }, [refetch])

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    setMessage(null)

    try {
      const payload = {
        min_qty: Number(formState.minQty),
        active: formState.active,
        valid_from: formState.validFrom || null,
        valid_to: formState.validTo || null,
      }

      if (wholesaleRule) {
        await updatePricingRule(wholesaleRule.rule_id, payload)
      } else {
        await createPricingRule({
          rule_type: "WHOLESALE_MIN_QTY_TOTAL",
          ...payload,
        })
      }

      refetch()
      setDraft(null)
      setMessage(PRICE.rules.messages.saved)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : PRICE.rules.messages.saveError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PosHeader
        eyebrow={PRICE.header.rules.eyebrow}
        title={PRICE.header.rules.title}
        actions={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={loading}
            aria-label={PRICE.header.refresh}
            className="rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      <OpsMetricInlineGroup
        items={[
          { label: PRICE.rules.metrics.rules, value: rules.length },
          { label: PRICE.rules.metrics.wholesaleMin, value: wholesaleRule?.min_qty ?? 0, tone: "accent" },
          { label: PRICE.rules.metrics.active, value: wholesaleRule?.active ? PRICE.rules.metrics.yes : PRICE.rules.metrics.no, tone: wholesaleRule?.active ? "success" : "default" },
        ]}
      />

      <OpsSectionDivider>
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={opsFieldLabelClassName}>
                  {PRICE.rules.form.minQty}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formState.minQty}
                  onChange={(event) => updateDraft((current) => ({ ...current, minQty: event.target.value }))}
                  className={opsInputCompact}
                />
              </div>

              <div>
                <label className={opsFieldLabelClassName}>
                  {PRICE.rules.form.status}
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--ops-text)]">
                  <input
                    type="checkbox"
                    checked={formState.active}
                    onChange={(event) => updateDraft((current) => ({ ...current, active: event.target.checked }))}
                    className="h-4 w-4 rounded border-[var(--ops-border-strong)] accent-[var(--ripnel-accent)]"
                  />
                  {PRICE.rules.form.activeLabel}
                </label>
              </div>

              <DateFilterPicker
                label={PRICE.rules.form.validFrom}
                value={formState.validFrom}
                onChange={(value) => updateDraft((current) => ({ ...current, validFrom: value }))}
                ariaLabel={PRICE.rules.form.validFrom}
              />

              <DateFilterPicker
                label={PRICE.rules.form.validTo}
                value={formState.validTo}
                onChange={(value) => updateDraft((current) => ({ ...current, validTo: value }))}
                ariaLabel={PRICE.rules.form.validTo}
                min={formState.validFrom || undefined}
              />
            </div>

            {message ? (
              <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${MSG_BOX_SUCCESS}`}>
                {message}
              </div>
            ) : null}

            {submitError ? (
              <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${MSG_BOX_ERROR}`}>
                {submitError}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="accent"
                size="sm"
                className="rounded-lg px-3"
                onClick={() => void handleSubmit()}
                disabled={submitting || Number.isNaN(Number(formState.minQty)) || Number(formState.minQty) <= 0}
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {PRICE.rules.form.saving}
                  </>
                ) : (
                  PRICE.rules.form.save
                )}
              </Button>
            </div>
          </section>

          <OpsTableBlock>
            <OpsTableWrap minWidth="720px">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface-muted)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-3">{PRICE.rules.table.columns.rule}</th>
                    <th className="px-4 py-3">{PRICE.rules.table.columns.min}</th>
                    <th className="px-4 py-3">{PRICE.rules.table.columns.validity}</th>
                    <th className="px-4 py-3">{PRICE.rules.table.columns.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                      >
                        {PRICE.rules.table.loading}
                      </td>
                    </tr>
                  ) : rules.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                      >
                        {PRICE.rules.table.empty}
                      </td>
                    </tr>
                  ) : (
                    rules.map((rule) => (
                      <tr
                        key={rule.rule_id}
                        className="transition hover:bg-[var(--ops-surface-muted)]"
                      >
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-sm font-semibold text-[var(--ops-text)]">
                          {rule.rule_type}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-sm text-[var(--ops-text)]">
                          {rule.min_qty}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-sm text-[var(--ops-text-muted)]">
                          {formatDate(rule.valid_from)} -{" "}
                          {rule.valid_to ? formatDate(rule.valid_to) : PRICE.rules.table.noEnd}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <OpsStatusBadge tone={rule.active ? "success" : "neutral"}>
                            {rule.active ? PRICE.rules.table.active : PRICE.rules.table.inactive}
                          </OpsStatusBadge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </OpsTableWrap>
          </OpsTableBlock>
        </div>
      </OpsSectionDivider>
    </>
  )
}
