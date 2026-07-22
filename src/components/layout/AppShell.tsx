"use client";

import { ReactNode } from "react";

import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

import { CurrentProject } from "@/components/common/CurrentProject";
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
        <AppHeader
          title="Workspace"
          description="Visus Knowledge Intelligence"
        />

        <main className="flex-1 overflow-auto p-8">
          <SidebarTrigger className="mb-6" />

          <div className="mb-6">
            <CurrentProject />
          </div>

          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}