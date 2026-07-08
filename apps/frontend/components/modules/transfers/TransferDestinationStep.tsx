"use client";

import { OpsStepSectionHeading } from "@/components/ui/ops-step-section-heading";
import { WORKSPACE_SECTION_CLASS } from "@/components/ui/ops-control-styles";
import { RequestRouteField } from "./transfers-request-ui";
import { TRANS } from "./transfers-messages";
import type { RequestLocationOption } from "./transfers-shared";

type TransferDestinationStepProps = {
  originOptions: RequestLocationOption[];
  originId: string;
  onOriginChange: (value: string) => void;
  destinationName: string;
  destinationType?: string | null;
  hasDraftLines: boolean;
};

export function TransferDestinationStep({
  originOptions,
  originId,
  onOriginChange,
  destinationName,
  destinationType,
  hasDraftLines,
}: TransferDestinationStepProps) {
  return (
    <section className={WORKSPACE_SECTION_CLASS}>
      <OpsStepSectionHeading step={1} title={TRANS.request.dataSection} />
      <RequestRouteField
        originOptions={originOptions}
        originValue={originId}
        onOriginChange={onOriginChange}
        destinationName={destinationName}
        destinationType={destinationType}
        hasDraftLines={hasDraftLines}
      />
    </section>
  );
}