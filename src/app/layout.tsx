import type { Metadata } from "next";
import localFont from "next/font/local";

import { Signature } from "@/components/common/Signature";
import { Toaster } from "@/components/ui/sonner";

import { PlansProvider } from "@/features/plans/providers/PlansProvider";
import { PanelsProvider } from "@/features/metrics/panels/PanelsProvider";
import { FollowsProvider } from "@/features/people/providers/FollowsProvider";
import { SavedViewsProvider } from "@/features/library/providers/SavedViewsProvider";
import { LibraryProvider } from "@/features/library/providers/LibraryProvider";
import { PeopleProvider } from "@/features/people/providers/PeopleProvider";
import { ActivityProvider } from "@/features/activities/providers/ActivityProvider";
import { KnowledgeLifecycleProvider } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { TicketsProvider } from "@/features/analysis/providers/TicketsProvider";
import { ProjectProvider } from "@/providers/ProjectProvider";
import { BrandThemeProvider } from "@/providers/BrandThemeProvider";
import { TaxonomyProvider } from "@/features/taxonomy/providers/TaxonomyProvider";
import { AppearanceProvider, appearanceScript } from "@/providers/AppearanceProvider";
import { ReleaseProvider } from "@/features/release/providers/ReleaseProvider";
import { ReleaseBanner } from "@/features/release/components/ReleaseBanner";
import { SessionProvider } from "@/features/auth/providers/SessionProvider";
import { AccessGate } from "@/features/auth/components/AccessGate";
import { WorkspaceBootstrap } from "@/features/auth/components/WorkspaceBootstrap";

import "./globals.css";

/**
 * Poppins é a fonte da identidade AltoQi e vem do kit de marca, servida daqui
 * e não do Google: a família toda está em `src/fonts`. Dos 18 pesos do kit,
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
    /*
      A supressão vale só para os atributos do `<html>`, e existe porque o
      script de aparência escreve `data-appearance` antes da primeira pintura.
      O servidor não tem como saber a preferência de quem abre, e sem o
      script a tela pisca clara antes de escurecer.
    */
    <html lang="pt-BR" className={poppins.variable} suppressHydrationWarning>
      <head>
        {/*
          Antes de qualquer pintura: sem isto a tela abre clara e escurece.
          A divergência de atributo que ele cria é o motivo do
          `suppressHydrationWarning` acima.
        */}
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {/*
          O aviso fica **fora** dos portões de acesso e de migração.
          Estava dentro, e quando um deles não renderizava. Leitura de sessão
          falhando, verificação pendurada: o toast de erro não tinha onde
          aparecer. O resultado era tela branca sem uma linha de explicação.
        */}
        <Toaster position="top-right" richColors closeButton />

        {/*
          Fora dos portões pelo mesmo motivo do aviso, e por um mais simples:
          não renderiza nada. Só escreve no console, uma vez por carga.
        */}
        <Signature />

        {/*
          Nova versão publicada e trabalho pendente ficam **acima** dos portões
          de acesso, pelo mesmo motivo do aviso: a publicação acontece
          independentemente de a sessão ter sido lida, e quem está com a aba
          aberta precisa saber.
        */}
        <ReleaseProvider>
        <ReleaseBanner />

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
                <LibraryProvider>
                  {/*
                    Painéis por último: não dependem de ninguém, e quem os lê
                    precisa de todos os domínios acima para contar.
                  */}
                  <PanelsProvider>
                    {/* Acompanhamentos dependem de saber quem é a pessoa, e de mais nada. */}
                    <FollowsProvider>
                      <SavedViewsProvider>{children}</SavedViewsProvider>
                    </FollowsProvider>
                  </PanelsProvider>
                </LibraryProvider>
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
        </ReleaseProvider>
      </body>
    </html>
  );
}
