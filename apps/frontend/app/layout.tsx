import type { Metadata, Viewport } from "next";
import { Poppins, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const poppins = Poppins({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "App Ripnel",
  description: "Aplicacion de gestion de inventarios para Ripnel",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={cn(poppins.className, "font-sans", geist.variable)}
    >
<body suppressHydrationWarning>
        <AuthProvider>
          <TooltipProvider>
            {children}
            <Toaster
              richColors
              closeButton
              position="top-right"
              toastOptions={{
                style: {
                  fontFamily: "var(--font-poppins)",
                  fontSize: "14px",
                },
              }}
            />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
