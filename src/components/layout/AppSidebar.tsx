"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FileSearch,
  FolderKanban,
  History,
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
  {
    title: "Atividades",
    icon: History,
    href: "/activities",
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
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-2">
        <div className="flex flex-col gap-2.5 px-2 py-1">
          {/*
            Duas marcas, uma por estado. O lockup horizontal traz o nome e só
            cabe expandido; recolhido sobra o símbolo. Ambos são a versão para
            fundo escuro — verde e branco — porque o sidebar é escuro.
          */}
          <Image
            src="/brand/altoqi-horizontal-dark.png"
            alt="AltoQi"
            width={320}
            height={102}
            priority
            /* `self-start` é obrigatório: num flex-column o padrão é esticar,
               e a marca sairia deformada na largura. */
            className="h-8 w-auto self-start object-contain group-data-[collapsible=icon]:hidden"
          />

          <Image
            src="/brand/altoqi-symbol-dark.png"
            alt="AltoQi"
            width={96}
            height={83}
            priority
            className="mx-auto hidden h-7 w-auto self-center object-contain group-data-[collapsible=icon]:block"
          />

          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <h2 className="truncate text-[0.95rem] font-semibold leading-tight tracking-tight">
              Knowledge Intelligence
            </h2>

            <p className="truncate text-xs text-sidebar-foreground/60">
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
