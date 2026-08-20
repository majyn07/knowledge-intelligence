import type { Metadata } from "next";
import localFont from "next/font/local";

import { Toaster } from "@/components/ui/sonner";

import { PlansProvider } from "@/features/plans/providers/PlansProvider";
import { LibraryProvider } from "@/features/library/providers/LibraryProvider";
import { PeopleProvider } from "@/features/people/providers/PeopleProvider";
import { ActivityProvider } from "@/features/activities/providers/ActivityProvider";
import { KnowledgeLifecycleProvider } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { TicketsProvider } from "@/features/analysis/providers/TicketsProvider";
import { ProjectProvider } from "@/providers/ProjectProvider";
import { BrandThemeProvider } from "@/providers/BrandThemeProvider";
import { TaxonomyProvider } from "@/features/taxonomy/providers/TaxonomyProvider";

import "./globals.css";

/**
 * Poppins é a fonte da identidade AltoQi e vem do kit de marca, servida daqui
 * e não do Google — a família toda está em `src/fonts`. Dos 18 pesos do kit,
 * quatro cobrem a interface; carregar os outros custaria banda sem uso.
 */
const poppins = localFont({
  variable: "--font-poppins",
  display: "swap",
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
  src: [
    { path: "../fonts/Poppins-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Poppins-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/Poppins-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/Poppins-Bold.ttf", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Visus Knowledge Intelligence",
    template: "%s · Visus KI",
  },
  description:
    "Plataforma da AltoQi para transformar atendimentos de suporte em conhecimento publicado, com decisão humana no centro.",
  applicationName: "Visus Knowledge Intelligence",
  authors: [{ name: "AltoQi" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <BrandThemeProvider>
          <TaxonomyProvider>
          <PeopleProvider>
          <ActivityProvider>
          <ProjectProvider>
            <TicketsProvider>
            <KnowledgeLifecycleProvider>
              <PlansProvider>
                <LibraryProvider>{children}</LibraryProvider>
              </PlansProvider>
            </KnowledgeLifecycleProvider>
            </TicketsProvider>

            <Toaster
            position="top-right"
            richColors
            closeButton
            />
          </ProjectProvider>
          </ActivityProvider>
          </PeopleProvider>
          </TaxonomyProvider>
        </BrandThemeProvider>
      </body>
    </html>
  );
}
