"use client";

import { PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OpsStepSectionHeading } from "@/components/ui/ops-step-section-heading";
import { SearchablePicker } from "@/components/ui/searchable-picker";
import { WORKSPACE_SECTION_CLASS } from "@/components/ui/ops-control-styles";
import { cn } from "@/lib/utils";

import { ADJ } from "./adjustments-messages";
import {
  type AdjustmentVariant,
  type DraftAdjustmentLine,
  type GroupedAdjustmentStyle,
} from "./inventory-adjustments-shared";

interface AdjustmentVariantsStepProps {
  variantQuery: string;
  onVariantQueryChange: (value: string) => void;
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
  effectiveCreateLocationId: string;
  hasBlockingAction: boolean;
  loadingVariants: boolean;
  variantResults: AdjustmentVariant[];
  highlightedIndex: number;
  onHighlightChange: (index: number) => void;
  filteredGroupedStyles: GroupedAdjustmentStyle[];
  selectedStyle: GroupedAdjustmentStyle | null;
  onSelectStyle: (style: GroupedAdjustmentStyle | null) => void;
  draftLines: DraftAdjustmentLine[];
  addDraftLine: (variant: AdjustmentVariant) => void;
  removeDraftLine: (variantId: string) => void;
  updateCountedQty: (variantId: string, rawValue: string) => void;
  errors: { _form?: string; location_id?: string; lines?: string };
  clearFormError: () => void;
  setVariantResults: (results: AdjustmentVariant[]) => void;
  selectedStyleAvailableCount: number;
}

export default function AdjustmentVariantsStep({
  variantQuery,
  onVariantQueryChange,
  pickerOpen,
  onPickerOpenChange,
  effectiveCreateLocationId,
  hasBlockingAction,
  loadingVariants,
  highlightedIndex,
  onHighlightChange,
  filteredGroupedStyles,
  selectedStyle,
  onSelectStyle,
  draftLines,
  addDraftLine,
  clearFormError,
  setVariantResults,
  selectedStyleAvailableCount,
}: AdjustmentVariantsStepProps) {
  return (
    <section className={WORKSPACE_SECTION_CLASS}>
      <OpsStepSectionHeading
        step={2}
        title={ADJ.create.variantsSection}
      />

      <SearchablePicker
        value={variantQuery}
        onChange={(value) => {
          onVariantQueryChange(value);
          onHighlightChange(0);
          onSelectStyle(null);
          clearFormError();
        }}
        open={pickerOpen}
        onOpenChange={onPickerOpenChange}
        items={filteredGroupedStyles}
        loading={loadingVariants}
        highlightedIndex={highlightedIndex}
        onHighlightChange={onHighlightChange}
        getItemKey={(style) => style.styleId}
        renderItem={(style) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                {style.styleName}
              </p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                {style.styleCode}
              </p>
            </div>
            <span className="shrink-0 text-xs text-[var(--ops-text-muted)]">
              {ADJ.create.searchResultCounts(style.variants.length, style.totalSystemQty)}
            </span>
          </div>
        )}
        onSelect={(style) => {
          onSelectStyle(style);
        }}
        closeOnSelect={false}
        density="compact"
        disabled={!effectiveCreateLocationId || hasBlockingAction}
        placeholder={ADJ.create.searchPlaceholder}
        minQueryLength={2}
        emptyStateMode="query"
        emptyMessage={ADJ.create.noResults}
        loadingMessage={ADJ.create.searching}
        onClear={() => {
          onVariantQueryChange("");
          setVariantResults([]);
          onHighlightChange(0);
          onSelectStyle(null);
          clearFormError();
        }}
      />

      {selectedStyle ? (
        <div className="mt-4 space-y-3 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ops-text)]">
                {selectedStyle.styleName}
              </p>
              <p className="text-xs text-[var(--ops-text-muted)]">
                {ADJ.create.subpanelMeta(
                  selectedStyle.styleCode,
                  selectedStyle.variants.length,
                  selectedStyle.totalSystemQty
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => onSelectStyle(null)}
              >
                {ADJ.create.closeSubpanel}
              </Button>
              <Button
                type="button"
                variant="accent"
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  for (const variant of selectedStyle.variants) {
                    if (!draftLines.some((line) => line.variant_id === variant.variant_id)) {
                      addDraftLine(variant);
                    }
                  }
                }}
                disabled={selectedStyleAvailableCount === 0}
              >
                <PackagePlus className="h-4 w-4" />
                {ADJ.create.addAll}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[580px] rounded-lg border border-[var(--ops-border-strong)]">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-2.5">{ADJ.create.variantTable.sizeColor}</th>
                    <th className="px-4 py-2.5 text-right">{ADJ.create.variantTable.system}</th>
                    <th className="px-4 py-2.5 text-right">{ADJ.create.variantTable.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {selectedStyle.variants.map((variant) => {
                    const alreadyAdded = draftLines.some(
                      (line) => line.variant_id === variant.variant_id
                    );

                    return (
                      <tr
                        key={variant.variant_id}
                        className={cn(
                          "transition",
                          alreadyAdded
                            ? "bg-[var(--ops-surface-muted)] opacity-60"
                            : "hover:bg-[var(--ops-surface-muted)]"
                        )}
                      >
                        <td className="px-4 py-2">
                          <p className="text-sm text-[var(--ops-text)]">
                            {variant.size_code} / {variant.color_name}
                          </p>
                          <p className="text-[11px] uppercase text-[var(--ripnel-accent-hover)]">
                            {variant.sku}
                          </p>
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-[var(--ops-text-muted)]">
                          {variant.system_qty}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {alreadyAdded ? (
                            <span className="text-xs text-[var(--ops-text-muted)]">
                              {ADJ.create.added}
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => addDraftLine(variant)}
                            >
                              <PackagePlus className="h-3.5 w-3.5" />
                              {ADJ.create.addOne}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}