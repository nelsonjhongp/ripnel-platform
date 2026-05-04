"use client";

import { ProtectedErrorPage } from "@/components/feedback/status-page";

export default function ProtectedError() {
  return <ProtectedErrorPage title="Falló la carga del módulo" description="No pudimos renderizar esta sección. Vuelve al inicio o reintenta desde el menú lateral." />;
}
