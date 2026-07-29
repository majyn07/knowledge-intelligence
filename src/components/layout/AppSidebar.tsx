"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FileSearch,
  FolderKanban,
  Home,
  Plug,
  Settings,
  Sparkles,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { brandThemes, useBrandTheme } from "@/providers/BrandThemeProvider";

const workspaceItems = [
  {
    title: "Início",
    icon: Home,
    href: "/",
  },
  {
    title: "Workspace",
    icon: Sparkles,
    href: "/analysis",
  },
  {
    title: "Projetos",
    icon: FolderKanban,
    href: "/projects",
  },
  {
    title: "Biblioteca",
    icon: BookOpen,
    href: "/library",
  },
  {
    title: "Plano de Melhorias",
    icon: FileSearch,
    href: "/improvement-plan",
  },
];

const managementItems = [
  {
    title: "Métricas",
    icon: BarChart3,
    href: "/indicators",
  },
];

const systemItems = [
  {
    title: "Integrações",
    icon: Plug,
    href: "/integrations",
  },
  {
    title: "Configurações",
    icon: Settings,
    href: "/settings",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { theme } = useBrandTheme();
  const brand = brandThemes[theme];

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="py-6">
        <div className="px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/60">
            Powered by AltoQi
          </p>

          <h2 className="mt-2 text-lg font-semibold leading-tight">
            Knowledge Intelligence
          </h2>

          <p className="text-sm text-sidebar-foreground/70">
            {brand.name}
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="space-y-1 px-2 py-3">
          <p className="text-xs font-medium text-sidebar-foreground">
            Produto
          </p>

          <p className="text-xs text-sidebar-foreground/70">
            🟣 Visus
          </p>

          <p className="pt-2 text-[11px] text-sidebar-foreground/50">
            v0.1.0
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
