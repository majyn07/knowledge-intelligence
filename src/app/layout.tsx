import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import { PlansProvider } from "@/features/plans/providers/PlansProvider";
import { KnowledgeLifecycleProvider } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { AppProvider } from "@/providers/AppProvider";
import { BrandThemeProvider } from "@/providers/BrandThemeProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Visus Knowledge Intelligence",
  description:
    "Assistente inteligente para análise de atendimentos e evolução da Base de Conhecimento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <BrandThemeProvider>
          <AppProvider>
            <KnowledgeLifecycleProvider>
              <PlansProvider>{children}</PlansProvider>
            </KnowledgeLifecycleProvider>
            
            <Toaster
            position="top-right"
            richColors
            closeButton
            />
          </AppProvider>
        </BrandThemeProvider>
      </body>
    </html>
  );
}
