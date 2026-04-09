"use client";

import { ErrorPage } from "@/components/feedback/status-page";

export default function ProtectedError() {
  return <ErrorPage title="Falló la carga del módulo" description="No pudimos renderizar esta sección. Vuelve al inicio o reintenta desde el menú lateral." />;
}