"use client";

import type { ReactNode, RefObject } from "react";

import { AdminInlineMessage } from "@/components/admin/admin-ui";
import { OpsPageShell, OpsSectionDivider } from "@/components/ui/ops-page-shell";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { TooltipProvider } from "@/components/ui/tooltip";

import { DraftSummaryPanel } from "./transfers-request-ui";
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
  children?: ReactNode;
};

export function TransferRequestWorkspace({
  headerActions,
  pageError,
  originOptions,
  originId,
  destinationName,
  destinationType,
  draftLines,
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
  children,
}: TransferRequestWorkspaceProps) {
  const hasOriginSelected = Boolean(originId);
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
                {children}
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
