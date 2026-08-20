import type { PanelSpec } from "./panelSpec";

/**
 * Os painéis que aparecem antes de alguém montar os próprios.
 *
 * São semente, não código privilegiado: podem ser editados e removidos como
 * qualquer outro, e "restaurar os painéis padrão" traz esta lista de volta.
 * Um painel que não pode ser mexido seria a mesma parede que o construtor
 * existe para derrubar.
 *
 * Os ids são fixos para que restaurar substitua o painel padrão em vez de
 * duplicá-lo.
 */
export const defaultPanels: PanelSpec[] = [
  {
    id: "panel-publicados-mes",
    title: "Artigos publicados por mês",
    source: "arrivals",
    stage: "published",
    breakdown: "month",
    visual: "bar",
    window: 365,
    scopedToProject: false,
    order: 0,
  },
  {
    id: "panel-artigos-estagio",
    title: "Artigos por estágio",
    source: "articles",
    breakdown: "status",
    visual: "bar",
    window: null,
    scopedToProject: false,
    order: 1,
  },
  {
    id: "panel-cobertura-categoria",
    title: "Acervo por categoria do portal",
    source: "articles",
    breakdown: "category",
    visual: "table",
    window: null,
    scopedToProject: false,
    order: 2,
  },
  {
    id: "panel-planos-equipe",
    title: "Planos por equipe",
    source: "plans",
    breakdown: "team",
    visual: "bar",
    window: null,
    scopedToProject: false,
    order: 3,
  },
  {
    id: "panel-oportunidades-status",
    title: "Oportunidades por decisão",
    source: "opportunities",
    breakdown: "status",
    visual: "bar",
    window: 90,
    scopedToProject: false,
    order: 4,
  },
  {
    id: "panel-atendimentos-mes",
    title: "Atendimentos por mês",
    source: "tickets",
    breakdown: "month",
    visual: "bar",
    window: 365,
    scopedToProject: false,
    order: 5,
  },
];
