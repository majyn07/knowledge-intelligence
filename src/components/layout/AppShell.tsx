"use client";

import { ReactNode } from "react";

import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>

      <AppSidebar />

      <SidebarInset>

        <AppHeader />

        <main className="flex-1 overflow-auto p-8">
          <SidebarTrigger className="mb-6" />

          {children}
        </main>

      </SidebarInset>

    </SidebarProvider>
  );
}