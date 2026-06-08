"use client";

import { TransfersListPage } from "./transfers-list-page";

export function TransfersPendingPage() {
  return <TransfersListPage initialQueue="pending_receipts" />;
}
