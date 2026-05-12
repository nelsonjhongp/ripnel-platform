"use client";

import { ProtectedErrorPage } from "@/components/feedback/status-page";

export default function ProtectedError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void _error;
  return (
    <ProtectedErrorPage
      title="Falló la carga del módulo"
      description="No pudimos renderizar esta sección. Podés reintentar o volver al inicio."
      onReset={reset}
    />
  );
}
