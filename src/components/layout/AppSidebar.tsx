"use client";

import {
  FolderOpen,
  BookOpen,
  BarChart3,
  Bell,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  {
    title: "Projetos",
    icon: FolderOpen,
  },
  {
    title: "Biblioteca",
    icon: BookOpen,
  },
  {
    title: "Indicadores",
    icon: BarChart3,
  },
  {
    title: "Atividades",
    icon: Bell,
  },
  {
    title: "Configurações",
    icon: Settings,
  },
];

export function AppSidebar() {
  return (
    <Sidebar variant="sidebar" collapsible="icon">

      <SidebarHeader className="py-6">

        <div className="px-2">

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">
            AltoQi
          </p>

          <h2 className="mt-2 text-lg font-semibold leading-tight">
            Visus Knowledge
          </h2>

          <p className="text-sm text-sidebar-foreground/70">
            Intelligence
          </p>

        </div>

      </SidebarHeader>

      <SidebarContent>

        <SidebarMenu>

          {items.map((item) => (
            <SidebarMenuItem key={item.title}>

              <SidebarMenuButton tooltip={item.title}>

                <item.icon />

                <span>{item.title}</span>

              </SidebarMenuButton>

            </SidebarMenuItem>
          ))}

        </SidebarMenu>

      </SidebarContent>

      <SidebarFooter>

        <div className="px-2 py-2 text-xs text-sidebar-foreground/60">
          v0.1.0
        </div>

      </SidebarFooter>

    </Sidebar>
  );
}