import { items, oneOf, record, text } from "@/lib/shape";
import { SEARCH_KIND_ORDER, type SearchResultKind } from "./globalSearch";

/**
 * O que a pessoa abriu por último.
 *
 * O trabalho real é reabrir as mesmas cinco coisas: o artigo que está sendo
 * escrito, o plano em revisão, o atendimento que gerou os dois. Sem isso,
 * voltar a qualquer um deles custa uma busca.
 */
export interface RecentEntry {
  kind: SearchResultKind;
  id: string;
  title: string;
  href: string;
  /** Instante em ISO, para ordenar e para exibir "há quanto tempo". */
  at: string;
}

/**
 * Quantos guardar.
 *
 * Pequeno de propósito. Uma lista longa deixa de ser "onde eu estava" e vira
 * um segundo histórico — e histórico o produto já tem, completo e auditável.
 */
export const MAX_RECENT = 8;

export function normalizeRecent(raw: unknown): RecentEntry | null {
  const value = record(raw);

  const id = text(value.id);
  const href = text(value.href);

  // Sem identidade ou sem destino a entrada não leva a lugar nenhum.
  if (id === "" || href === "") return null;

  return {
    kind: oneOf(value.kind, SEARCH_KIND_ORDER, "article"),
    id,
    title: text(value.title),
    href,
    at: text(value.at),
  };
}

export function parseRecent(raw: string): RecentEntry[] {
  return items(JSON.parse(raw))
    .map(normalizeRecent)
    .filter((entry): entry is RecentEntry => entry !== null)
    .slice(0, MAX_RECENT);
}

/**
 * Registra uma visita.
 *
 * Reabrir o mesmo registro o move para o topo em vez de duplicar — a lista
 * responde "onde eu estava", e o mesmo item duas vezes não responde nada.
 *
 * Comandos não entram: a paleta já os mostra todos, e eles empurrariam para
 * fora justamente os registros que valem lembrar.
 */
export function remember(
  current: RecentEntry[],
  entry: Omit<RecentEntry, "at">,
  now: Date
): RecentEntry[] {
  if (entry.kind === "command") return current;
  if (entry.id === "" || entry.href === "") return current;

  const rest = current.filter(
    (item) => !(item.kind === entry.kind && item.id === entry.id)
  );

  return [{ ...entry, at: now.toISOString() }, ...rest].slice(0, MAX_RECENT);
}

/** Remove o que aponta para um registro que não existe mais. */
export function pruneRecent(
  current: RecentEntry[],
  exists: (entry: RecentEntry) => boolean
): RecentEntry[] {
  return current.filter(exists);
}
