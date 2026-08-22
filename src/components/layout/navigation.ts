import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileSearch,
  FolderKanban,
  History,
  Home,
  Plug,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
}

/**
 * As rotas do produto, num lugar só.
 *
 * O menu lateral e a trilha de navegação leem daqui. Cada um tinha a própria
 * ideia de como a página se chama, e duas listas do mesmo vocabulário divergem
 * — o menu diria "Métricas" e a trilha "Indicadores" sobre a mesma tela.
 */
export const workspaceItems: NavItem[] = [
  { title: "Início", icon: Home, href: "/" },
  { title: "Levantamento", icon: ClipboardCheck, href: "/survey" },
  { title: "Workspace", icon: Sparkles, href: "/analysis" },
  { title: "Projetos", icon: FolderKanban, href: "/projects" },
  { title: "Biblioteca", icon: BookOpen, href: "/library" },
];

export const managementItems: NavItem[] = [
  { title: "Métricas", icon: BarChart3, href: "/indicators" },
  { title: "Plano de Melhorias", icon: FileSearch, href: "/improvement-plan" },
  { title: "Atividades", icon: History, href: "/activities" },
];

export const systemItems: NavItem[] = [
  { title: "Integrações", icon: Plug, href: "/integrations" },
  { title: "Configurações", icon: Settings, href: "/settings" },
];

const allItems = [...workspaceItems, ...managementItems, ...systemItems];

export function navItemOf(href: string): NavItem | undefined {
  return allItems.find((item) => item.href === href);
}

export interface Crumb {
  label: string;
  /** Ausente no último degrau: ele é onde a pessoa está. */
  href?: string;
}

/**
 * A trilha até a página atual.
 *
 * Deriva do caminho porque a hierarquia do produto é a das rotas: o artigo
 * mora dentro da Biblioteca, e a Biblioteca dentro do Início. Um segmento que
 * não está no cadastro é um identificador — o registro aberto —, e quem sabe o
 * nome dele é a tela, que passa `leaf`.
 *
 * Sem `leaf`, o identificador não vira degrau: mostrar um `uuid` na trilha
 * seria pior que não mostrar nada.
 */
export function buildTrail(pathname: string, leaf?: string): Crumb[] {
  const início: Crumb = { label: "Início", href: "/" };

  if (pathname === "/") return [{ label: "Início" }];

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [início];

  let acumulado = "";

  for (const segment of segments) {
    acumulado += `/${segment}`;

    const item = navItemOf(acumulado);
    if (item) crumbs.push({ label: item.title, href: item.href });
  }

  if (leaf) crumbs.push({ label: leaf });

  /*
    O último degrau é onde a pessoa está, e não deve ser um link para onde ela
    já se encontra.
  */
  const último = crumbs[crumbs.length - 1];
  if (último.href === pathname) crumbs[crumbs.length - 1] = { label: último.label };

  return crumbs;
}
