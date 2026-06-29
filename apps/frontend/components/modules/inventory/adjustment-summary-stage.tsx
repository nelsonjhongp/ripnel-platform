"use client";

import type { ReactNode } from "react";
import { Check, ClipboardList, FileText, LoaderCircle, MapPin, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OpsMetricRow } from "@/components/ui/ops-metric-row";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { INFO_BOX_XL, SURFACE_MUTED_BG } from "./adjustments-constants";
import { ADJ } from "./adjustments-messages";

type SummaryTone = "neutral" | "success" | "warning" | "danger" | "accent";

type AdjustmentSummaryStageProps = {
  locationLabel: string
  intentLabel: string
  reasonLabel: string
  notesLabel: string
  draftLabel: string
  draftStatus: {
    title: string
    description: string
    tone: SummaryTone
  }
  totals: {
    totalSystem: number
    totalCounted: number
    totalDiff: number
    noChange: number
    withDiff: number
  }
  canSaveDraft: boolean
  canReview: boolean
  isSavingDraft: boolean
  isReviewing: boolean
  isConfirming: boolean
  hasPersistedDraft: boolean
  onSaveDraft: () => void
  onReview: () => void
}

function SummaryInfoRow({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: string
  detail?: string | null
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${INFO_BOX_XL} px-3 py-2.5`}>
      <div className="flex min-w-0 items-start gap-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[var(--ripnel-accent)]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            {label}
          </p>
          <p className="truncate text-[14px] font-medium text-[var(--ops-text)]">{value}</p>
          {detail ? (
            <p className="mt-0.5 truncate text-[11px] text-[var(--ops-text-muted)]">{detail}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AdjustmentSummaryStage({
  locationLabel,
  intentLabel,
  reasonLabel,
  notesLabel,
  draftLabel,
  draftStatus,
  totals,
  canSaveDraft,
  canReview,
  isSavingDraft,
  isReviewing,
  isConfirming,
  hasPersistedDraft,
  onSaveDraft,
  onReview,
}: AdjustmentSummaryStageProps) {
  return (
    <article className="sales-panel rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4 shadow-sm transition-all duration-200 sm:p-5 xl:sticky xl:top-20 xl:self-start">
      <div className="flex items-center justify-between gap-3" aria-live="polite">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ripnel-accent)]">
            <ClipboardList className="h-4 w-4" />
          </span>
          <h2 className="text-[1.05rem] font-semibold text-[var(--ops-text)]">{ADJ.create.summary}</h2>
        </div>
        <OpsStatusBadge tone={draftStatus.tone} size="sm" className="shrink-0">
          {draftStatus.title}
        </OpsStatusBadge>
      </div>

      <div className="mt-4 space-y-3">
        <div
          aria-live="polite"
          className={`rounded-xl border border-[var(--ops-border-strong)] ${SURFACE_MUTED_BG} px-3 py-2.5`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              {ADJ.create.summaryStateLabel}
            </p>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              {draftLabel}
            </span>
          </div>
          <p className="mt-1.5 text-[15px] font-semibold text-[var(--ops-text)]">{draftStatus.title}</p>
        </div>

        <div className="space-y-2.5">
          <SummaryInfoRow
            label={ADJ.create.summaryLocation}
            value={locationLabel}
            icon={<MapPin className="h-4 w-4" />}
          />
          <SummaryInfoRow
            label={ADJ.create.summaryIntent}
            value={intentLabel}
            icon={<ShieldAlert className="h-4 w-4" />}
          />
          <SummaryInfoRow
            label={ADJ.create.summaryReason}
            value={reasonLabel}
            detail={notesLabel}
            icon={<FileText className="h-4 w-4" />}
          />
        </div>

        <div className="space-y-2 border-t border-[var(--ops-border-strong)] pt-2.5 text-sm">
          <OpsMetricRow label={ADJ.metrics.systemTotal} value={String(totals.totalSystem)} />
          <OpsMetricRow label={ADJ.metrics.countedTotal} value={String(totals.totalCounted)} />
          <OpsMetricRow
            label={ADJ.metrics.difference}
            value={`${totals.totalDiff > 0 ? "+" : ""}${totals.totalDiff}`}
            tone={totals.totalDiff !== 0 ? "warning" : "default"}
          />
          <div className="border-t border-[var(--ops-border-strong)] pt-2">
            <OpsMetricRow label={ADJ.metrics.lines} value={String(totals.noChange + totals.withDiff)} />
            <OpsMetricRow label={ADJ.metrics.linesWithDiff} value={String(totals.withDiff)} />
            <OpsMetricRow label={ADJ.metrics.linesNoChange} value={String(totals.noChange)} />
          </div>
        </div>

        <div className="space-y-2 border-t border-[var(--ops-border-strong)] pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full rounded-lg"
            disabled={!canSaveDraft}
            onClick={onSaveDraft}
          >
            {isSavingDraft ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {ADJ.create.saving}
              </>
            ) : hasPersistedDraft ? (
              <>
                <Check className="h-4 w-4" />
                {ADJ.create.savedDraft}
              </>
            ) : (
              ADJ.create.saveDraft
            )}
          </Button>

          <Button
            type="button"
            variant="accent"
            size="sm"
            className="w-full rounded-lg"
            disabled={!canReview}
            onClick={onReview}
          >
            {isSavingDraft ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {ADJ.create.savingBeforeReview}
              </>
            ) : isReviewing ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {ADJ.create.reviewReady}
              </>
            ) : isConfirming ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {ADJ.dialog.confirming}
              </>
            ) : (
              ADJ.create.reviewAndConfirm
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
