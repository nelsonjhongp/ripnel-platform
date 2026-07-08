"use client";

import type { ReactNode, RefObject } from "react";
import { Trash2 } from "lucide-react";

import { AdminInlineMessage } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { OpsHint } from "@/components/ui/ops-hint";
import { WORKSPACE_SECTION_CLASS } from "@/components/ui/ops-control-styles";
import { OpsPageShell, OpsSectionDivider } from "@/components/ui/ops-page-shell";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { OpsStepSectionHeading } from "@/components/ui/ops-step-section-heading";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { SearchablePicker } from "@/components/ui/searchable-picker";
import { TooltipProvider } from "@/components/ui/tooltip";

import {
  DraftSummaryPanel,
  RequestDraftTable,
  RequestProductComposer,
  RequestRouteField,
} from "./transfers-request-ui";
import { TRANS } from "./transfers-messages";
import type {
  DraftLine,
  RequestCandidateSource,
  RequestLocationOption,
  RequestProductGroup,
  RequestProductVariant,
} from "./transfers-shared";

export type TransferRequestSubmittedSummary = {
  originName: string;
  originType: string | null;
  destinationName: string;
  destinationType: string | null;
  lines: number;
  units: number;
  notes: string | null;
  transferNumber: string | null;
};

export type TransferRequestSubmittedTransfer = {
  transfer_id: string;
  transfer_number: string | null;
};

export type DuplicateDraftVariant = {
  variantId: string;
  message: string;
  token?: number;
} | null;

type TransferRequestWorkspaceProps = {
  headerActions?: ReactNode;
  pageError?: string | null;
  originOptions: RequestLocationOption[];
  originId: string;
  onOriginChange: (value: string) => void;
  destinationName: string;
  destinationType?: string | null;
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
  notes: string;
  onNotesChange: (value: string) => void;
  onClearNotes: () => void;
  notePresets: readonly string[];
  notesMaxLength: number;
  submittedTransfer: TransferRequestSubmittedTransfer | null;
  submittedSummary: TransferRequestSubmittedSummary | null;
  onViewSubmittedTransfer: () => void;
  onStartNewRequest: () => void;
  submitting: boolean;
  onRequestReview: () => void;
  dialogLayer?: ReactNode;
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

export function TransferRequestWorkspace({
  headerActions,
  pageError,
  originOptions,
  originId,
  onOriginChange,
  destinationName,
  destinationType,
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
  notes,
  onNotesChange,
  onClearNotes,
  notePresets,
  notesMaxLength,
  submittedTransfer,
  submittedSummary,
  onViewSubmittedTransfer,
  onStartNewRequest,
  submitting,
  onRequestReview,
  dialogLayer,
}: TransferRequestWorkspaceProps) {
  const hasOriginSelected = Boolean(originId);
  const requestCompleted = Boolean(submittedTransfer);
  const selectedOrigin =
    originOptions.find((option) => option.value === originId) || null;

  return (
    <OpsPageShell width="wide" className="max-w-[1380px]">
      <TooltipProvider delayDuration={120}>
        <div className="space-y-4">
          <PosHeader
            eyebrow={TRANS.header.eyebrow}
            title={TRANS.request.pageTitle}
            actions={headerActions}
          />

          {pageError ? <AdminInlineMessage tone="danger">{pageError}</AdminInlineMessage> : null}

          <OpsSectionDivider>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(360px,400px)] xl:items-start">
              <div className="space-y-4">
                {requestCompleted ? (
                  <section className="ops-surface rounded-xl border p-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-[var(--ops-text)]">
                        {TRANS.request.sentSuccess}
                      </p>
                      <p className="text-sm text-[var(--ops-text-muted)]">
                        {TRANS.request.draftClosed} Puedes revisar el detalle o iniciar una nueva
                        solicitud desde el panel de resumen.
                      </p>
                    </div>
                  </section>
                ) : (
                  <>
                    <section className={WORKSPACE_SECTION_CLASS}>
                      <OpsStepSectionHeading step={1} title={TRANS.request.dataSection} />
                      <RequestRouteField
                        originOptions={originOptions}
                        originValue={originId}
                        onOriginChange={onOriginChange}
                        destinationName={destinationName}
                        destinationType={destinationType}
                        hasDraftLines={draftLines.length > 0}
                      />
                    </section>

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
                )}
              </div>

              <section className="xl:sticky xl:top-20 xl:self-start">
                <DraftSummaryPanel
                  draftLines={draftLines}
                  destinationName={destinationName}
                  destinationType={destinationType}
                  originName={originId ? selectedOrigin?.label || "" : ""}
                  originType={selectedOrigin?.type}
                  originSelected={hasOriginSelected}
                  submittedSummary={submittedSummary}
                  notes={notes}
                  onNotesChange={onNotesChange}
                  onClearNotes={onClearNotes}
                  notesMaxLength={notesMaxLength}
                  notePresets={notePresets}
                  submittedTransfer={submittedTransfer}
                  onViewSubmittedTransfer={onViewSubmittedTransfer}
                  onStartNewRequest={onStartNewRequest}
                  submitting={submitting}
                  onSubmit={onRequestReview}
                />
              </section>
            </div>
          </OpsSectionDivider>
        </div>

        {dialogLayer}
      </TooltipProvider>
    </OpsPageShell>
  );
}
