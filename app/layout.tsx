import type React from "react";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "@/components/theme-context";
import { GradientBackground } from "@/components/gradient-background";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
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
    <html lang="en" className={`${montserrat.variable} antialiased`} suppressHydrationWarning>
      <body className="antialiased bg-transparent select-none relative overflow-x-hidden min-h-screen font-sans">
        <ThemeProvider>
          <div className="fixed inset-0 z-[-1] pointer-events-none">
            <GradientBackground />
          </div>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}