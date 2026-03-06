import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

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
    <html lang="es" className={poppins.className}>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <body> {children}</body>
    </html>
  );
}