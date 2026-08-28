import { flag, items, record, text } from "@/lib/shape";
import type {
  Taxonomy,
  TaxonomyCategory,
  TaxonomyEntry,
  TaxonomySection,
} from "@/models/Taxonomy";

import { buildPortalTaxonomy } from "./mock/portalTaxonomy";

/** Número inteiro não negativo, ou a posição da lista quando o campo falta. */
function orderOf(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

function normalizeEntries(raw: unknown): TaxonomyEntry[] {
  return items(raw)
    .map((entry, index) => {
      const value = record(entry);
      return {
        id: text(value.id),
        name: text(value.name),
        order: orderOf(value.order, index),
      };
    })
    .filter((entry) => entry.id !== "" && entry.name !== "");
}

/**
 * Garante a forma da taxonomia vinda do armazenamento.
 *
 * Duas regras que não são só defensivas:
 *
 * Registro sem id ou sem nome é **descartado**, não completado. Categoria com
 * id gerado na hora quebraria o vínculo com os artigos que apontam para ela,
 * pior que não existir, porque pareceria certa.
 *
 * Seção órfã, cuja categoria não está mais na lista, também sai. Ela nunca
 * apareceria em nenhuma cascata e ficaria acumulando em silêncio.
 */
export function normalizeTaxonomy(raw: unknown): Taxonomy {
  const value = record(raw);

  const categories: TaxonomyCategory[] = items(value.categories)
    .map((entry, index) => {
      const category = record(entry);
      return {
        id: text(category.id),
        name: text(category.name),
        isProduct: flag(category.isProduct),
        order: orderOf(category.order, index),
      };
    })
    .filter((category) => category.id !== "" && category.name !== "");

  const known = new Set(categories.map((category) => category.id));

  const sections: TaxonomySection[] = items(value.sections)
    .map((entry, index) => {
      const section = record(entry);
      return {
        id: text(section.id),
        categoryId: text(section.categoryId),
        name: text(section.name),
        order: orderOf(section.order, index),
      };
    })
    .filter(
      (section) =>
        section.id !== "" && section.name !== "" && known.has(section.categoryId)
    );

  return {
    categories,
    sections,
    genres: normalizeEntries(value.genres),
    opportunityTypes: normalizeEntries(value.opportunityTypes),
  };
}

/**
 * Lê a taxonomia guardada, caindo para a semente do portal quando o registro
 * não tem categoria nenhuma. Um cadastro vazio deixaria a Biblioteca sem
 * classificação possível. Cair para a semente é mais útil que um app inerte.
 */
export function parseTaxonomy(raw: string): Taxonomy {
  const parsed = normalizeTaxonomy(JSON.parse(raw));
  return parsed.categories.length > 0 ? parsed : buildPortalTaxonomy();
}
