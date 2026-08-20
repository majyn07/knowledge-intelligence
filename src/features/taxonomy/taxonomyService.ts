import {
  type Taxonomy,
  type TaxonomyEntry,
  taxonomyId,
} from "@/models/Taxonomy";

/**
 * Operações do cadastro de taxonomia.
 *
 * Tudo aqui é função pura sobre a taxonomia inteira: recebe, devolve nova.
 * O provider só guarda o resultado. Isso mantém a regra testável e deixa a
 * troca de armazenamento — que vem na sprint de fundação compartilhada —
 * restrita a uma camada.
 */

/** Nome já usado no mesmo escopo, ignorando acento, caixa e espaço extra. */
function sameName(a: string, b: string) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .toLowerCase();

  return normalize(a) === normalize(b);
}

/** Id livre a partir do nome, com sufixo quando já existe. */
function freeId(prefix: string, name: string, taken: Set<string>) {
  const base = taxonomyId(prefix, name);

  let id = base;
  let attempt = 2;
  while (taken.has(id)) {
    id = `${base}-${attempt}`;
    attempt += 1;
  }

  return id;
}

function nextOrder(list: { order: number }[]) {
  return list.reduce((max, item) => Math.max(max, item.order + 1), 0);
}

export function addCategory(
  taxonomy: Taxonomy,
  name: string,
  isProduct: boolean
): Taxonomy {
  const trimmed = name.trim();
  if (trimmed === "") return taxonomy;

  if (taxonomy.categories.some((item) => sameName(item.name, trimmed))) {
    return taxonomy;
  }

  const taken = new Set(taxonomy.categories.map((item) => item.id));

  return {
    ...taxonomy,
    categories: [
      ...taxonomy.categories,
      {
        id: freeId("cat", trimmed, taken),
        name: trimmed,
        isProduct,
        order: nextOrder(taxonomy.categories),
      },
    ],
  };
}

export function renameCategory(
  taxonomy: Taxonomy,
  id: string,
  name: string
): Taxonomy {
  const trimmed = name.trim();
  if (trimmed === "") return taxonomy;

  return {
    ...taxonomy,
    categories: taxonomy.categories.map((item) =>
      item.id === id ? { ...item, name: trimmed } : item
    ),
  };
}

/**
 * Remove a categoria e, com ela, as seções que só existiam dentro dela.
 *
 * Os artigos que apontavam para essas seções **não são tocados**: continuam
 * com o identificador antigo, que passa a não resolver. É deliberado — a tela
 * de artigos sem seção existe para que eles apareçam e sejam reclassificados,
 * em vez de serem realocados por adivinhação.
 */
export function removeCategory(taxonomy: Taxonomy, id: string): Taxonomy {
  return {
    ...taxonomy,
    categories: taxonomy.categories.filter((item) => item.id !== id),
    sections: taxonomy.sections.filter((item) => item.categoryId !== id),
  };
}

export function addSection(
  taxonomy: Taxonomy,
  categoryId: string,
  name: string
): Taxonomy {
  const trimmed = name.trim();
  if (trimmed === "") return taxonomy;
  if (!taxonomy.categories.some((item) => item.id === categoryId)) return taxonomy;

  const siblings = taxonomy.sections.filter(
    (item) => item.categoryId === categoryId
  );
  if (siblings.some((item) => sameName(item.name, trimmed))) return taxonomy;

  const taken = new Set(taxonomy.sections.map((item) => item.id));
  const prefix = categoryId.replace(/^cat-/, "sec-");

  return {
    ...taxonomy,
    sections: [
      ...taxonomy.sections,
      {
        id: freeId(prefix, trimmed, taken),
        categoryId,
        name: trimmed,
        order: nextOrder(siblings),
      },
    ],
  };
}

export function renameSection(
  taxonomy: Taxonomy,
  id: string,
  name: string
): Taxonomy {
  const trimmed = name.trim();
  if (trimmed === "") return taxonomy;

  return {
    ...taxonomy,
    sections: taxonomy.sections.map((item) =>
      item.id === id ? { ...item, name: trimmed } : item
    ),
  };
}

export function removeSection(taxonomy: Taxonomy, id: string): Taxonomy {
  return {
    ...taxonomy,
    sections: taxonomy.sections.filter((item) => item.id !== id),
  };
}

/** Listas simples — gênero e tipo de oportunidade compartilham o comportamento. */
export type EntryList = "genres" | "opportunityTypes";

const entryPrefix: Record<EntryList, string> = {
  genres: "gen",
  opportunityTypes: "opp",
};

export function addEntry(
  taxonomy: Taxonomy,
  list: EntryList,
  name: string
): Taxonomy {
  const trimmed = name.trim();
  if (trimmed === "") return taxonomy;

  const current = taxonomy[list];
  if (current.some((item) => sameName(item.name, trimmed))) return taxonomy;

  const taken = new Set(current.map((item) => item.id));
  const entry: TaxonomyEntry = {
    id: freeId(entryPrefix[list], trimmed, taken),
    name: trimmed,
    order: nextOrder(current),
  };

  return { ...taxonomy, [list]: [...current, entry] };
}

export function renameEntry(
  taxonomy: Taxonomy,
  list: EntryList,
  id: string,
  name: string
): Taxonomy {
  const trimmed = name.trim();
  if (trimmed === "") return taxonomy;

  return {
    ...taxonomy,
    [list]: taxonomy[list].map((item) =>
      item.id === id ? { ...item, name: trimmed } : item
    ),
  };
}

/**
 * Remove um item da lista, exceto o último.
 *
 * Um artigo precisa de gênero e uma oportunidade precisa de tipo. Esvaziar a
 * lista deixaria o formulário sem opção nenhuma e o registro impossível de
 * completar — a única restrição que o cadastro impõe, e por um motivo.
 */
export function removeEntry(
  taxonomy: Taxonomy,
  list: EntryList,
  id: string
): Taxonomy {
  if (taxonomy[list].length <= 1) return taxonomy;

  return {
    ...taxonomy,
    [list]: taxonomy[list].filter((item) => item.id !== id),
  };
}
