import type { SearchGroup, SearchResult } from "./globalSearch";

/**
 * Comandos da paleta.
 *
 * Antes disto, `Ctrl+K` com o campo vazio mostrava "digite ao menos dois
 * caracteres" — uma tela que não faz nada. Comandos preenchem esse vazio com o
 * que a pessoa mais quer dali: ir a algum lugar.
 *
 * Só navegação e criação. Publicar, aprovar e excluir ficam de fora de
 * propósito: são decisões do ciclo, e o produto pede intenção para elas — uma
 * lista que se percorre com a seta não é lugar para isso.
 */
export interface Command {
  id: string;
  label: string;
  /** Termos alternativos, para quem procura pela palavra que usa. */
  keywords: string;
  href: string;
}

export const commands: Command[] = [
  { id: "go-home", label: "Ir para o Início", keywords: "inicio home painel dashboard", href: "/" },
  { id: "go-analysis", label: "Ir para o Workspace de análise", keywords: "workspace analise atendimento ticket", href: "/analysis" },
  { id: "go-projects", label: "Ir para Projetos", keywords: "projetos", href: "/projects" },
  { id: "go-library", label: "Ir para a Biblioteca", keywords: "biblioteca artigos base de conhecimento", href: "/library" },
  { id: "go-indicators", label: "Ir para Métricas", keywords: "metricas indicadores numeros", href: "/indicators" },
  { id: "go-plans", label: "Ir para Plano de Melhorias", keywords: "planos melhoria", href: "/improvement-plan" },
  { id: "go-activities", label: "Ir para Atividades", keywords: "atividades historico log eventos", href: "/activities" },
  { id: "go-integrations", label: "Ir para Integrações", keywords: "integracoes hubspot claude gemini", href: "/integrations" },
  { id: "go-settings", label: "Ir para Configurações", keywords: "configuracoes ajustes taxonomia equipes aparencia tema", href: "/settings" },
];

function comparable(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Comandos que casam com o texto digitado.
 *
 * Campo vazio devolve todos: é o estado em que a paleta acabou de abrir, e
 * mostrar o que ela sabe fazer é mais útil que pedir para digitar.
 */
export function matchCommands(query: string): Command[] {
  const term = comparable(query.trim());
  if (term === "") return commands;

  return commands.filter(
    (command) =>
      comparable(command.label).includes(term) || comparable(command.keywords).includes(term)
  );
}

/** Empacota como grupo de busca, para reusar a navegação por teclado. */
export function commandGroup(query: string): SearchGroup | null {
  const matched = matchCommands(query);
  if (matched.length === 0) return null;

  const results: SearchResult[] = matched.map((command) => ({
    kind: "command",
    id: command.id,
    title: command.label,
    subtitle: "",
    projectId: "",
    href: command.href,
    score: 1,
  }));

  return { kind: "command", results };
}
