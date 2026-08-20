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
import { AppearanceProvider, appearanceScript } from "@/providers/AppearanceProvider";
import { SessionProvider } from "@/features/auth/providers/SessionProvider";
import { AccessGate } from "@/features/auth/components/AccessGate";
import { WorkspaceBootstrap } from "@/features/auth/components/WorkspaceBootstrap";

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
      <head>
        {/*
          Antes de qualquer pintura: sem isto a tela abre clara e escurece.
          Escreve num atributo que o React não renderiza, então não há
          divergência de hidratação para suprimir.
        */}
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {/*
          O aviso fica **fora** dos portões de acesso e de migração.
          Estava dentro, e quando um deles não renderizava — leitura de sessão
          falhando, verificação pendurada — o toast de erro não tinha onde
          aparecer. O resultado era tela branca sem uma linha de explicação.
        */}
        <Toaster position="top-right" richColors closeButton />

        <AppearanceProvider>
        <BrandThemeProvider>
          {/*
            Sessão acima de tudo que lê dados: com as políticas do banco
            fechadas, não há leitura possível antes de haver acesso.
          */}
          <SessionProvider>
          <AccessGate>
          <TaxonomyProvider>
          <WorkspaceBootstrap>
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

          </ProjectProvider>
          </ActivityProvider>
          </PeopleProvider>
          </WorkspaceBootstrap>
          </TaxonomyProvider>
          </AccessGate>
          </SessionProvider>
        </BrandThemeProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
