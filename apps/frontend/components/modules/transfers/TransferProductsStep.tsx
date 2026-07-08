"use client";

import type { RefObject } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OpsHint } from "@/components/ui/ops-hint";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { OpsStepSectionHeading } from "@/components/ui/ops-step-section-heading";
import { SearchablePicker } from "@/components/ui/searchable-picker";
import { WORKSPACE_SECTION_CLASS } from "@/components/ui/ops-control-styles";
import {
  RequestDraftTable,
  RequestProductComposer,
} from "./transfers-request-ui";
import { TRANS } from "./transfers-messages";
import type { DuplicateDraftVariant } from "./transfers-request-workspace";
import type {
  DraftLine,
  RequestCandidateSource,
  RequestProductGroup,
  RequestProductVariant,
} from "./transfers-shared";

type TransferProductsStepProps = {
  originId: string;
  hasOriginSelected: boolean;
  requestQuery: string;
  onRequestQueryChange: (value: string) => void;
  requestPickerOpen: boolean;
  onRequestPickerOpenChange: (open: boolean) => void;
  requestProducts: RequestProductGroup[];
  loadingRequestProducts: boolean;
  requestProductsError?: string | null;
  requestProductsEmptyMessage: string;
  highlightedRequestIndex: number;
  onHighlightedRequestIndexChange: (index: number) => void;
  requestSearchInputRef: RefObject<HTMLInputElement | null>;
  selectedRequestProduct: RequestProductGroup | null;
  onSelectRequestProduct: (product: RequestProductGroup) => void;
  onClearRequestProduct: () => void;
  onAddRequestLine: (
    variant: RequestProductVariant,
    source: RequestCandidateSource,
    quantity: number
  ) => void;
  duplicateDraftVariant: DuplicateDraftVariant;
  draftLines: DraftLine[];
  onUpdateLineQty: (variantId: string, rawValue: string) => void;
  onRemoveLine: (variantId: string) => void;
  onRequestClearDraft: () => void;
};

function buildProductOptionSummary(product: RequestProductGroup) {
  const colorsCount = new Set(
    product.variants.map((variant) => variant.color_name).filter(Boolean)
  ).size;
  const sizesCount = new Set(
    product.variants.map((variant) => variant.size_code).filter(Boolean)
  ).size;

  return { colorsCount, sizesCount };
}

export function TransferProductsStep({
  originId,
  hasOriginSelected,
  requestQuery,
  onRequestQueryChange,
  requestPickerOpen,
  onRequestPickerOpenChange,
  requestProducts,
  loadingRequestProducts,
  requestProductsError,
  requestProductsEmptyMessage,
  highlightedRequestIndex,
  onHighlightedRequestIndexChange,
  requestSearchInputRef,
  selectedRequestProduct,
  onSelectRequestProduct,
  onClearRequestProduct,
  onAddRequestLine,
  duplicateDraftVariant,
  draftLines,
  onUpdateLineQty,
  onRemoveLine,
  onRequestClearDraft,
}: TransferProductsStepProps) {
  return (
    <>
      <section className={WORKSPACE_SECTION_CLASS}>
        <OpsStepSectionHeading step={2} title={TRANS.request.productsSection} />
        <SearchablePicker
          value={requestQuery}
          onChange={(value) => {
            if (!hasOriginSelected) return;
            onRequestQueryChange(value);
          }}
          openOnFocus
          placeholder={
            hasOriginSelected
              ? TRANS.request.searchPlaceholder
              : TRANS.request.selectOriginFirst
          }
          disabled={!hasOriginSelected}
          open={requestPickerOpen}
          onOpenChange={onRequestPickerOpenChange}
          items={requestProducts}
          loading={loadingRequestProducts}
          error={requestProductsError || null}
          loadingMessage="Buscando productos disponibles..."
          emptyMessage={requestProductsEmptyMessage}
          maxVisibleItems={8}
          highlightedIndex={highlightedRequestIndex}
          onHighlightChange={onHighlightedRequestIndexChange}
          inputRef={requestSearchInputRef}
          getItemKey={(product) => product.product_key}
          renderItem={(product) => {
            const { colorsCount, sizesCount } = buildProductOptionSummary(product);

            return (
              <div className="flex min-w-0 items-center">
                <p className="min-w-0 truncate text-sm text-[var(--ops-text)]">
                  <span className="font-semibold">{product.style_name}</span>
                  <span className="text-[var(--ops-text-muted)]">
                    {` · ${colorsCount} ${colorsCount === 1 ? "color" : "colores"} · ${sizesCount} ${sizesCount === 1 ? "talla" : "tallas"} · stock: ${product.total_available} u.`}
                  </span>
                </p>
              </div>
            );
          }}
          onSelect={onSelectRequestProduct}
          onClear={onClearRequestProduct}
          showClear={Boolean(requestQuery || selectedRequestProduct)}
          selectedItemKey={selectedRequestProduct?.product_key}
          density="compact"
          inputMode="search"
          enterKeyHint="search"
        />

        <div className="pt-1">
          {selectedRequestProduct ? (
            <RequestProductComposer
              key={`${selectedRequestProduct.product_key}:${originId || "all"}`}
              product={selectedRequestProduct}
              lockedOriginId={originId}
              onAdd={onAddRequestLine}
              duplicateDraftVariant={duplicateDraftVariant}
            />
          ) : (
            <OpsHint>
              {hasOriginSelected
                ? TRANS.request.selectProductHint
                : TRANS.request.selectOriginHint}
            </OpsHint>
          )}
        </div>
      </section>

      <section className={WORKSPACE_SECTION_CLASS}>
        <OpsStepSectionHeading
          step={3}
          title={TRANS.request.draftSection}
          meta={
            <>
              <OpsStatusBadge
                tone={draftLines.length > 0 ? "accent" : "neutral"}
                size="sm"
              >
                {TRANS.request.linesCount(draftLines.length)}
              </OpsStatusBadge>
              {draftLines.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRequestClearDraft}
                  className="rounded-lg text-[var(--ops-tone-danger-text)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-tone-danger-text)]"
                >
                  <Trash2 className="h-4 w-4" />
                  {TRANS.request.clearAll}
                </Button>
              ) : null}
            </>
          }
        />
        <RequestDraftTable
          draftLines={draftLines}
          onUpdateLineQty={onUpdateLineQty}
          onRemoveLine={onRemoveLine}
          highlightedVariantId={duplicateDraftVariant?.variantId || null}
          highlightToken={duplicateDraftVariant?.token}
        />
      </section>
    </>
  );
}