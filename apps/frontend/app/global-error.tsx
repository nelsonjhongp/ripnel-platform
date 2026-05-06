"use client";

import { Poppins, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ErrorPage } from "@/components/feedback/status-page";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const poppins = Poppins({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void _error;
  return (
    <html
      lang="es"
      className={cn(poppins.className, "font-sans", geist.variable)}
    >
      <body suppressHydrationWarning>
        <ErrorPage
          title="La aplicación falló al renderizar esta vista"
          description="Recarga la página o reintenta. Si el problema persiste, volvé al inicio."
          onReset={reset}
        />
      </body>
    </html>
  );
}
