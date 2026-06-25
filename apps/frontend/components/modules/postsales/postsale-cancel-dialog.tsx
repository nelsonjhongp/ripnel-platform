"use client"

import { useState } from "react"
import { LoaderCircle, ShieldAlert, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { PresetTextField } from "@/components/ui/preset-text-field"
import { apiFetch } from "@/lib/api"
import { explainApiError } from "@/lib/error-utils"
import { PS } from "./postsales-messages"
import { CANCEL_REASON_PRESETS } from "./postsales-constants"

interface CancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleId: string
  isAllowed: boolean
  blockedReasons: string[]
  onSuccess: () => void
}

export default function CancelDialog({
  open,
  onOpenChange,
  saleId,
  isAllowed,
  blockedReasons,
  onSuccess,
}: CancelDialogProps) {
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function initiateCancel(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) {
      setReasonError(PS.detail.alerts.reasonValidation)
      return
    }
    setReasonError(null)
    setConfirmOpen(true)
  }

  async function executeCancellation() {
    setFormError(null)
    setSubmitting(true)

    try {
      await apiFetch(`/api/postsales/${saleId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason, notes }),
      })
      onSuccess()
      setConfirmOpen(false)
      onOpenChange(false)
    } catch (e) {
      setFormError(explainApiError(e, PS.cancelDialog.errorFallback))
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = reason.trim().length > 0 && !submitting

  return (
    <>
      <OpsDialog
        open={open}
        onOpenChange={onOpenChange}
        title={PS.cancelDialog.title}
        description={PS.cancelDialog.description}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-lg"
            >
              {PS.cancelDialog.close}
            </Button>
            <Button
              variant="accent"
              onClick={initiateCancel}
              disabled={!canSubmit || !isAllowed}
              className="rounded-lg"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {PS.cancelDialog.submitting}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Undo2 className="h-4 w-4" />
                  {PS.cancelDialog.submit}
                </span>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError ? (
            <p
              className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-3 py-2.5 text-sm text-[var(--ops-tone-danger-text)]"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          {!isAllowed ? (
            <div className="rounded-lg border border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] px-3 py-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ops-tone-warning-text)]" />
                <p className="text-sm text-[var(--ops-tone-warning-text)]">
                  {blockedReasons.join(" ")}
                </p>
              </div>
            </div>
          ) : null}

          <PresetTextField
            label={PS.detail.lines.reasonRequired}
            required
            error={reasonError}
            value={reason}
            onChange={(v) => {
              setReason(v)
              setReasonError(null)
            }}
            presets={CANCEL_REASON_PRESETS}
            placeholder={PS.detail.lines.reasonPlaceholderCancel}
            textareaRows={2}
            textareaClassName="min-h-[72px]"
          />

          <OpsFormField label={PS.detail.lines.notes} density="compact">
            <textarea
              autoComplete="off"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={200}
              className="sales-field min-h-[80px] w-full rounded-lg px-3 py-2.5 text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
              placeholder={PS.detail.lines.notesCancelPlaceholder}
            />
            <div className="mt-1 text-right text-[11px] tabular-nums text-[var(--ops-text-muted)]">
              {notes.length}/200
            </div>
          </OpsFormField>
        </div>
      </OpsDialog>

      <OpsDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={PS.cancelDialog.confirmTitle}
        description={PS.cancelDialog.confirmDescription}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
              className="rounded-lg"
            >
              {PS.cancelDialog.confirmCancel}
            </Button>
            <Button
              variant="destructive"
              onClick={executeCancellation}
              disabled={submitting}
              className="rounded-lg"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {PS.cancelDialog.confirming}
                </span>
              ) : (
                PS.cancelDialog.confirmSubmit
              )}
            </Button>
          </div>
        }
      >
        <div className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-3 py-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ops-tone-danger-text)]" />
            <p className="text-sm text-[var(--ops-tone-danger-text)]">
              {PS.cancelDialog.confirmImpact}
            </p>
          </div>
        </div>
      </OpsDialog>
    </>
  )
}
