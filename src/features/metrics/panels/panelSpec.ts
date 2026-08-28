/**
 * O que um painel é.
 *
 * Isto não é BI genérico sobre qualquer tabela: é um construtor restrito a
 * seis tipos de registro que o produto já modela. A restrição é o que torna o
 * construtor viável, e o que impede alguém montar um painel que não responde
 * pergunta nenhuma.
 */

export const PANEL_SOURCES = [
  "articles",
  "plans",
  "tickets",
  "analyses",
  "opportunities",
  "arrivals",
] as const;

export type PanelSource = (typeof PANEL_SOURCES)[number];

export const panelSourceLabel: Record<PanelSource, string> = {
  articles: "Artigos",
  plans: "Planos de melhoria",
  tickets: "Atendimentos",
  analyses: "Análises",
  opportunities: "Oportunidades",
  arrivals: "Chegadas a um estágio",
};

export const panelSourceHint: Record<PanelSource, string> = {
  articles: "Conta artigos pela data de criação.",
  plans: "Conta planos pela data de criação.",
  tickets: "Conta atendimentos pela data do atendimento.",
  analyses: "Conta análises pela data em que começaram.",
  opportunities: "Conta oportunidades dentro das análises da janela.",
  arrivals: "Conta quantas vezes algo chegou a um estágio, lendo o histórico.",
};

export const PANEL_BREAKDOWNS = [
  "none",
  "status",
  "category",
  "section",
  "genre",
  "type",
  "kind",
  "team",
  "project",
  "month",
] as const;

export type PanelBreakdown = (typeof PANEL_BREAKDOWNS)[number];

export const panelBreakdownLabel: Record<PanelBreakdown, string> = {
  none: "Sem quebra",
  status: "Por estágio",
  category: "Por categoria do portal",
  section: "Por seção do portal",
  genre: "Por gênero",
  type: "Por tipo de oportunidade",
  kind: "Por tipo de registro",
  team: "Por equipe",
  project: "Por projeto",
  month: "Por mês",
};

/**
 * Nem toda quebra faz sentido para toda origem.
 *
 * Quebrar atendimento por gênero de artigo produziria uma coluna vazia com
 * cara de dado. O construtor só oferece o que a origem sabe responder.
 */
export const allowedBreakdowns: Record<PanelSource, PanelBreakdown[]> = {
  articles: ["none", "status", "category", "section", "genre", "team", "project", "month"],
  plans: ["none", "status", "team", "project", "month"],
  tickets: ["none", "project", "month"],
  analyses: ["none", "status", "project", "month"],
  opportunities: ["none", "status", "type", "project"],
  arrivals: ["none", "kind", "project", "month"],
};

export const PANEL_VISUALS = ["number", "bar", "table"] as const;
export type PanelVisual = (typeof PANEL_VISUALS)[number];

export const panelVisualLabel: Record<PanelVisual, string> = {
  number: "Número único",
  bar: "Barras",
  table: "Tabela",
};

/** Janelas em dias. `null` é "desde sempre". */
export const PANEL_WINDOWS = [7, 30, 90, 365, null] as const;
export type PanelWindow = (typeof PANEL_WINDOWS)[number];

export function panelWindowLabel(days: PanelWindow): string {
  if (days === null) return "Desde o início";
  if (days === 7) return "Últimos 7 dias";
  if (days === 365) return "Último ano";
  return `Últimos ${days} dias`;
}

/**
 * Estágios que `arrivals` pode contar.
 *
 * Fixos no código de propósito, como o resto das máquinas de estado: têm
 * transição, teste e indicador amarrados, e não são cadastro.
 */
export const PANEL_STAGES = [
  { stage: "review", label: "Em revisão" },
  { stage: "published", label: "Publicado" },
  { stage: "archived", label: "Arquivado" },
  { stage: "draft", label: "Rascunho" },
  { stage: "development", label: "Em desenvolvimento" },
  { stage: "approved", label: "Aprovado" },
] as const;

export interface PanelSpec {
  id: string;
  title: string;
  source: PanelSource;
  breakdown: PanelBreakdown;
  /**
   * Segunda quebra, que cruza com a primeira e produz uma tabela.
   *
   * Para em duas de propósito. Três dimensões não cabem numa tabela que se lê
   * de relance, e a leitura passa a exigir girar o cubo. Que é outro tipo de
   * ferramenta, não uma versão mais completa desta.
   */
  breakdown2?: PanelBreakdown;
  visual: PanelVisual;
  window: PanelWindow;
  /** Só para `arrivals`: a qual estágio se chegou. */
  stage?: string;
  /** Só o projeto ativo, ou todos. */
  scopedToProject: boolean;
  order: number;
}

/**
 * Corrige uma especificação para uma combinação que existe.
 *
 * Trocar a origem pode invalidar a quebra escolhida antes, e um painel
 * pedindo "atendimentos por gênero" não deve ser gravado nem exibido vazio: ele
 * volta para "sem quebra", que é a resposta honesta.
 */
export function reconcileSpec(spec: PanelSpec): PanelSpec {
  const allowed = allowedBreakdowns[spec.source];

  const breakdown = allowed.includes(spec.breakdown) ? spec.breakdown : "none";

  /*
    A segunda quebra só existe cruzando com a primeira. Sem a primeira ela
    seria a primeira, e cruzar algo consigo mesmo produziria uma diagonal,
    tabela de uma coluna útil e o resto zerado.
  */
  const breakdown2 =
    breakdown !== "none" &&
    spec.breakdown2 &&
    spec.breakdown2 !== "none" &&
    spec.breakdown2 !== breakdown &&
    allowed.includes(spec.breakdown2)
      ? spec.breakdown2
      : undefined;

  // Número único não comporta quebra: seria um número por linha sem linha.
  // Cruzamento só cabe em tabela. Barra empilhada esconderia metade dos números.
  const visual = breakdown2
    ? "table"
    : spec.visual === "number" && breakdown !== "none"
      ? "bar"
      : spec.visual;

  /*
    `breakdown2` sai do espalhamento para poder ser **removido**, e não apenas
    sobrescrito: espalhar `spec` traria de volta a segunda quebra que acabou de
    ser considerada impossível.
  */
  const resto = { ...spec };
  delete resto.breakdown2;

  return {
    ...resto,
    breakdown,
    ...(breakdown2 ? { breakdown2 } : {}),
    visual,
    // `arrivals` sem estágio não conta nada; o padrão é o fim do ciclo.
    stage: spec.source === "arrivals" ? (spec.stage || "published") : undefined,
  };
}
