import type React from "react";
import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-context";
import { GradientBackground } from "@/components/gradient-background";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
  weight: "400",
});

export const metadata: Metadata = {
  title: "NYUAD iGEM 2026 Modeling Kit",
  description: "Interactive dry lab simulation workspace for bacteria-modified sand stabilization, modeling metabolic dynamics, thermodynamic cross-linking, aeolian geology, and protein docking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} antialiased`}>
      <body className="font-serif antialiased bg-transparent select-none relative overflow-x-hidden min-h-screen">
        <ThemeProvider>
          <GradientBackground />
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
