import type React from "react";
import type { Metadata } from "next";
import { Lexend, Press_Start_2P } from "next/font/google";
import localFont from "next/font/local";
import { Suspense } from "react";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "@/components/theme-context";
import { GradientBackground } from "@/components/gradient-background";
import { Providers } from "@/components/providers";

// Body / UI, Lexend across weights (see DESIGN.md §2)
const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

// Display / headings, Super Dream, the rounded retro face that matches the
// Dunelock wordmark. Shipped locally in public/fonts.
const superDream = localFont({
  src: "../public/fonts/SuperDream.ttf",
  display: "swap",
  variable: "--font-super-dream",
});

const pressStart = Press_Start_2P({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-press-start",
  weight: "400",
});

export const metadata: Metadata = {
  title: "NYUAD iGEM 2026 Modeling Kit",
  description:
    "Interactive dry lab simulation workspace for bacteria-modified sand stabilization, modeling metabolic dynamics, thermodynamic cross-linking, aeolian geology, and protein docking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${lexend.variable} ${superDream.variable} ${pressStart.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="antialiased bg-transparent select-none relative overflow-x-hidden min-h-screen font-sans">
        <ThemeProvider>
          <div className="fixed inset-0 z-[-1] pointer-events-none">
            <GradientBackground />
          </div>
          <Suspense fallback={null}>
            <Providers>{children}</Providers>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
