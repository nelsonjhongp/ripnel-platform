"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OpsQuantityStepper } from "@/components/ui/ops-quantity-stepper";
import { OpsStepSectionHeading } from "@/components/ui/ops-step-section-heading";
import { WORKSPACE_SECTION_CLASS } from "@/components/ui/ops-control-styles";
import { cn } from "@/lib/utils";

import {
  DIFF_NEGATIVE,
  DIFF_POSITIVE,
  DIFF_ZERO,
} from "./adjustments-constants";
import { ADJ } from "./adjustments-messages";
import type { DraftAdjustmentLine } from "./inventory-adjustments-shared";

interface AdjustmentDraftStepProps {
  draftLines: DraftAdjustmentLine[];
  draftTotals: {
    lines: number;
    totalSystem: number;
    totalCounted: number;
    totalDiff: number;
    noChange: number;
    withDiff: number;
  };
  updateCountedQty: (variantId: string, rawValue: string) => void;
  removeDraftLine: (variantId: string) => void;
}

export default function AdjustmentDraftStep({
  draftLines,
  draftTotals,
  updateCountedQty,
  removeDraftLine,
}: AdjustmentDraftStepProps) {
  return (
    <section className={WORKSPACE_SECTION_CLASS}>
      <OpsStepSectionHeading
        step={3}
        title={ADJ.create.draftSection}
        meta={
          draftLines.length > 0 ? (
            <span className="text-xs text-[var(--ops-text-muted)]">
              {ADJ.create.draftMeta(draftTotals.lines, draftTotals.withDiff, draftTotals.noChange)}
            </span>
          ) : null
        }
      />

      {draftLines.length > 0 ? (
        <div className="-mx-4 overflow-hidden rounded-b-xl sm:-mx-5">
          <div className="overflow-x-auto">
            <div className="min-w-[680px] border-y border-[var(--ops-border-strong)]">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface-muted)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-3">{ADJ.detail.variants}</th>
                    <th className="px-4 py-3 text-right">{ADJ.detail.system}</th>
                    <th className="px-4 py-3 text-right">{ADJ.detail.counted}</th>
                    <th className="px-4 py-3 text-right">{ADJ.detail.difference}</th>
                    <th className="px-4 py-3 text-right">
                      <span className="sr-only">Quitar</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {draftLines.map((line) => {
                    const diff = line.counted_qty - line.system_qty;

                    return (
                      <tr
                        key={line.variant_id}
                        className="transition hover:bg-[var(--ops-surface-muted)]"
                      >
                        <td className="px-4 py-[var(--ops-row-py)]">
                          <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                            {line.style_name}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                            {line.sku}
                          </p>
                          <p className="text-xs text-[var(--ops-text-muted)]">
                            {line.style_code} · {line.size_code} / {line.color_name}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right text-sm text-[var(--ops-text-muted)]">
                          {line.system_qty}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right">
                          <OpsQuantityStepper
                            layout="horizontal"
                            size="sm"
                            value={line.counted_qty}
                            onDecrement={() =>
                              updateCountedQty(
                                line.variant_id,
                                String(Math.max(0, line.counted_qty - 1))
                              )
                            }
                            onIncrement={() =>
                              updateCountedQty(
                                line.variant_id,
                                String(line.counted_qty + 1)
                              )
                            }
                            min={0}
                          />
                        </td>
                        <td
                          className={cn(
                            "px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold tabular-nums",
                            diff > 0
                              ? DIFF_POSITIVE
                              : diff < 0
                                ? DIFF_NEGATIVE
                                : DIFF_ZERO
                          )}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeDraftLine(line.variant_id)}
                            className="rounded-lg text-[var(--ops-text-muted)] hover:text-[var(--ops-tone-danger-text)]"
                            aria-label={ADJ.create.removeAria}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-[var(--ops-text-muted)]">
          {ADJ.create.emptyDraft}
        </p>
      )}
    </section>
  );
}