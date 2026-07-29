"use client";
import Image from "next/image";
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
];

const managementItems = [
  {
    title: "Métricas",
    icon: BarChart3,
    href: "/indicators",
  },
  {
    title: "Plano de Melhorias",
    icon: FileSearch,
    href: "/improvement-plan",
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
      <SidebarHeader className="p-2">
  <div className="flex items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
      <Image
        src="/logo-altoqi.png"
        alt="AltoQi"
        width={40}
        height={40}
        className="object-contain"
        priority
      />
    </div>

    <div className="min-w-0 group-data-[collapsible=icon]:hidden">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
        Powered by AltoQi
      </p>

      <h2 className="truncate text-lg font-semibold">
        Knowledge Intelligence
      </h2>

      <p className="truncate text-sm text-sidebar-foreground/65">
        Central de Conhecimento
      </p>
    </div>
  </div>
</SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pt-2">
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>

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

        <SidebarGroup className="pt-4">
          <SidebarGroupLabel>Análises</SidebarGroupLabel>

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

        <SidebarGroup className="pt-4">
          <SidebarGroupLabel>Administração</SidebarGroupLabel>

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
  <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
    <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
      <div className="group-data-[collapsible=icon]:hidden">
        <p className="text-xs font-semibold">
          Central de Conhecimento
        </p>

        <p className="text-[11px] text-sidebar-foreground/60">
          Build de desenvolvimento
        </p>
      </div>

      <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
        v0.1.0
      </span>
    </div>
  </div>
</SidebarFooter>
    </Sidebar>
  );
}