"use client";

import { ErrorPage } from "@/components/feedback/status-page";

export default function GlobalError() {
  return (
    <html lang="es">
      <body>
        <ErrorPage
          title="La aplicación falló al renderizar esta vista"
          description="Recarga la página o vuelve al inicio para retomar el flujo operativo."
        />
      </body>
    </html>
  );
}