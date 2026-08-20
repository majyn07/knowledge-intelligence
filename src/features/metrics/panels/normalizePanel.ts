import { flag, items, oneOf, record, text } from "@/lib/shape";
import type { DashboardPanelRow } from "@/lib/supabase/types";

import {
  PANEL_BREAKDOWNS,
  PANEL_SOURCES,
  PANEL_VISUALS,
  PANEL_WINDOWS,
  reconcileSpec,
  type PanelSpec,
  type PanelWindow,
} from "./panelSpec";

/**
 * Janela vinda de fora.
 *
 * `null` é "desde o início" e é valor legítimo — por isso não pode cair no
 * mesmo caminho de "campo ausente". Um número que não está na lista vira 30,
 * que é o padrão, em vez de virar janela infinita sem ninguém pedir.
 */
function panelWindow(value: unknown): PanelWindow {
  if (value === null) return null;

  const days = typeof value === "number" ? value : Number(value);

  return (PANEL_WINDOWS as readonly (number | null)[]).includes(days)
    ? (days as PanelWindow)
    : 30;
}

/**
 * Garante a forma do painel vindo do armazenamento ou do banco.
 *
 * Passa por `reconcileSpec` no fim: um painel gravado por uma versão que
 * oferecia uma quebra hoje inexistente não pode voltar como especificação
 * impossível — ele volta como a versão honesta de si mesmo.
 */
export function normalizePanel(raw: unknown, order = 0): PanelSpec {
  const value = record(raw);

  const source = oneOf(value.source, PANEL_SOURCES, "articles");

  return reconcileSpec({
    id: text(value.id) || crypto.randomUUID(),
    title: text(value.title) || "Painel sem título",
    source,
    breakdown: oneOf(value.breakdown, PANEL_BREAKDOWNS, "none"),
    // Ausente é o normal — o cruzamento é a exceção, não o padrão.
    ...(text(value.breakdown2)
      ? { breakdown2: oneOf(value.breakdown2, PANEL_BREAKDOWNS, "none") }
      : {}),
    visual: oneOf(value.visual, PANEL_VISUALS, "number"),
    window: panelWindow("window" in value ? value.window : undefined),
    ...(text(value.stage) ? { stage: text(value.stage) } : {}),
    scopedToProject: flag(value.scopedToProject),
    order: typeof value.order === "number" ? value.order : order,
  });
}

export function parsePanels(raw: string): PanelSpec[] {
  return items(JSON.parse(raw))
    .map((entry, index) => normalizePanel(entry, index))
    .sort((a, b) => a.order - b.order);
}

/** Linha do banco para especificação. */
export function toPanel(row: unknown): PanelSpec {
  const value = record(row);

  return normalizePanel({
    id: value.id,
    title: value.title,
    source: value.source,
    breakdown: value.breakdown,
    breakdown2: value.breakdown_2 ?? "",
    visual: value.visual,
    window: value.window_days ?? null,
    stage: value.stage ?? "",
    scopedToProject: value.scoped_to_project,
    order: value.position,
  });
}

/** Especificação para linha do banco. */
export function fromPanel(spec: PanelSpec): DashboardPanelRow {
  return {
    id: spec.id,
    title: spec.title,
    source: spec.source,
    breakdown: spec.breakdown,
    breakdown_2: spec.breakdown2 ?? null,
    visual: spec.visual,
    window_days: spec.window,
    stage: spec.stage ?? null,
    scoped_to_project: spec.scopedToProject,
    position: spec.order,
  };
}
