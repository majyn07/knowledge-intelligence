"use client";

import { ReactNode } from "react";

import { CurrentProject } from "@/components/common/CurrentProject";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({
  children,
}: AppShellProps) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />

      <SidebarInset className="overflow-hidden">
        {/*
          "Workspace" não dizia nada: era a palavra que sobrou de quando esta
          tela era uma só. Logo abaixo já vem a trilha, que diz onde a pessoa
          está, então aqui vale o nome do produto e não um rótulo genérico.
        */}
        <AppHeader title="Visus" description="Knowledge Intelligence" />

        <main className="technical-frame flex flex-1 flex-col overflow-hidden">
          <section className="border-b border-border/60 bg-card/55 backdrop-blur-xl">
            <div className="mx-auto w-full max-w-[1800px] px-6 py-5 xl:px-10">
              <CurrentProject />
            </div>
          </section>

          <section className="flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-[1800px] flex-1 px-6 py-8 xl:px-10">
              {children}
            </div>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
