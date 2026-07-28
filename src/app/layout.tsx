import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import { PlansProvider } from "@/features/plans/providers/PlansProvider";
import { AppProvider } from "@/providers/AppProvider";

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
        <AppProvider>
          <PlansProvider>{children}</PlansProvider>

          <Toaster
            position="top-right"
            richColors
            closeButton
          />
        </AppProvider>
      </body>
    </html>
  );
}
