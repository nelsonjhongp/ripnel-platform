import type { Metadata } from "next";
import { Poppins, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const poppins = Poppins({ 
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins'
});

export const metadata: Metadata = {
  title: "App Ripnel",
  description: "Aplicación de gestión de inventarios para Ripnel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <TooltipProvider >
        <html lang="es" className={cn(poppins.className, "font-sans", geist.variable)}>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <body>
              {children}
          </body>
        </html>
      </TooltipProvider>
    </SidebarProvider>
  );
}