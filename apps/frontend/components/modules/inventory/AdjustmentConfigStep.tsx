"use client";

import { type OpsOption, OpsSelect } from "@/components/ui/ops-selection";
import { OpsFormField } from "@/components/ui/ops-form-field";
import { OpsStepSectionHeading } from "@/components/ui/ops-step-section-heading";
import { PresetTextField } from "@/components/ui/preset-text-field";
import { WORKSPACE_SECTION_CLASS } from "@/components/ui/ops-control-styles";

import {
  INPUT_CLASS,
} from "./adjustments-constants";
import { ADJ } from "./adjustments-messages";
import {
  formatAdjustmentIntent,
  type AdjustmentIntent,
} from "./inventory-adjustments-shared";

const ADJUSTMENT_REASON_PRESETS: readonly string[] = [
  ADJ.create.motivoPresets.conteoFisico,
  ADJ.create.motivoPresets.merma,
  ADJ.create.motivoPresets.regularizacion,
  ADJ.create.motivoPresets.auditoria,
  ADJ.create.motivoPresets.cargaInicial,
];

const NOTES_MAX = 200;

interface AdjustmentConfigStepProps {
  locationOptions: OpsOption[];
  effectiveCreateLocationId: string;
  onLocationChange: (value: string) => void;
  adjustmentIntent: AdjustmentIntent;
  onIntentChange: (value: AdjustmentIntent) => void;
  createReason: string;
  onReasonChange: (value: string) => void;
  createNotes: string;
  onNotesChange: (value: string) => void;
  loadingLocations: boolean;
  hasBlockingAction: boolean;
  canChangeLocation: boolean;
  defaultLocation: { location_id: string } | null;
  resetSavedDraft: () => void;
  clearFormError: () => void;
  errors: { _form?: string; location_id?: string; lines?: string };
  setErrors: (errors: { _form?: string; location_id?: string; lines?: string }) => void;
}

export default function AdjustmentConfigStep({
  locationOptions,
  effectiveCreateLocationId,
  onLocationChange,
  adjustmentIntent,
  onIntentChange,
  createReason,
  onReasonChange,
  createNotes,
  onNotesChange,
  loadingLocations,
  hasBlockingAction,
  canChangeLocation,
  defaultLocation,
  resetSavedDraft,
  clearFormError,
  errors,
  setErrors,
}: AdjustmentConfigStepProps) {
  return (
    <section className={WORKSPACE_SECTION_CLASS}>
      <OpsStepSectionHeading step={1} title={ADJ.create.configSection} />

      <div className="grid gap-4 sm:grid-cols-2">
        <OpsFormField
          label={ADJ.create.locationLabel}
          error={errors.location_id}
          density="compact"
        >
          <OpsSelect
            value={effectiveCreateLocationId}
            onValueChange={(value) => {
              onLocationChange(value);
              clearFormError();
              resetSavedDraft();
              setErrors({
                ...errors,
                _form: undefined,
                location_id: undefined,
              });
            }}
            placeholder={ADJ.create.locationPlaceholder}
            options={locationOptions}
            disabled={
              loadingLocations ||
              hasBlockingAction ||
              (!canChangeLocation && Boolean(defaultLocation?.location_id))
            }
          />
        </OpsFormField>

        <OpsFormField label={ADJ.create.intentLabel} density="compact">
          <OpsSelect
            value={adjustmentIntent}
            onValueChange={(value) => {
              onIntentChange(value as AdjustmentIntent);
              resetSavedDraft();
            }}
            options={[
              {
                value: "adjustment",
                label: formatAdjustmentIntent("adjustment"),
                helper: ADJ.create.intentAdjustmentHelper,
              },
              {
                value: "opening",
                label: formatAdjustmentIntent("opening"),
                helper: ADJ.create.intentOpeningHelper,
              },
            ]}
            disabled={hasBlockingAction}
          />
        </OpsFormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            {ADJ.create.motivoLabel}
          </p>
          <PresetTextField
            value={createReason}
            onChange={(value) => {
              onReasonChange(value);
              resetSavedDraft();
            }}
            presets={ADJUSTMENT_REASON_PRESETS}
            placeholder={ADJ.create.customReasonPlaceholder}
            textareaRows={1}
            textareaClassName="min-h-[56px]"
            disabled={hasBlockingAction}
          />
        </div>

        <OpsFormField
          label={ADJ.create.notesLabel}
          optionalLabel={ADJ.create.notesOptionalLabel}
          density="compact"
        >
          <div className="relative">
            <textarea
              value={createNotes}
              onChange={(event) => {
                const value = event.target.value;
                if (value.length <= NOTES_MAX) {
                  onNotesChange(value);
                  resetSavedDraft();
                }
              }}
              rows={2}
              placeholder={ADJ.create.notesPlaceholder}
              className={`${INPUT_CLASS} min-h-[72px] resize-none pr-12`}
              disabled={hasBlockingAction}
            />
            {createNotes.length > 0 ? (
              <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-[var(--ops-text-muted)]">
                {ADJ.create.notesCounter(createNotes.length, NOTES_MAX)}
              </span>
            ) : null}
          </div>
        </OpsFormField>
      </div>
    </section>
  );
}