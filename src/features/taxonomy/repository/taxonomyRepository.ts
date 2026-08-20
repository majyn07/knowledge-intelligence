"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fromTaxonomy, toTaxonomy } from "@/lib/supabase/rows";
import type { Database } from "@/lib/supabase/types";
import type { Taxonomy } from "@/models/Taxonomy";

type Client = SupabaseClient<Database>;

/**
 * A taxonomia não é uma coleção plana: são três tabelas que compõem um objeto.
 * Por isso ela não usa `useSharedCollection` e tem repositório próprio.
 */
export async function readTaxonomy(client: Client): Promise<Taxonomy | null> {
  const [categories, sections, entries] = await Promise.all([
    client.from("taxonomy_categories").select("*"),
    client.from("taxonomy_sections").select("*"),
    client.from("taxonomy_entries").select("*"),
  ]);

  const failure = categories.error ?? sections.error ?? entries.error;
  if (failure) throw new Error(failure.message);

  return toTaxonomy(categories.data ?? [], sections.data ?? [], entries.data ?? []);
}

/**
 * Grava a diferença entre dois estados.
 *
 * A ordem importa e não é arbitrária: categoria entra antes da seção, porque a
 * seção referencia a categoria; e seção sai depois da categoria que a continha
 * ter saído, porque o `cascade` já a removeu. Fazer na ordem errada produz
 * violação de chave estrangeira num caminho que o usuário não entenderia.
 */
export async function writeTaxonomy(
  client: Client,
  anterior: Taxonomy,
  atual: Taxonomy
): Promise<void> {
  const antes = fromTaxonomy(anterior);
  const agora = fromTaxonomy(atual);

  const removidos = <T extends { id: string }>(a: T[], b: T[]) => {
    const vivos = new Set(b.map((item) => item.id));
    return a.filter((item) => !vivos.has(item.id)).map((item) => item.id);
  };

  const mudados = <T extends { id: string }>(a: T[], b: T[]) => {
    const anteriores = new Map(a.map((item) => [item.id, JSON.stringify(item)]));
    return b.filter((item) => anteriores.get(item.id) !== JSON.stringify(item));
  };

  const check = (error: { message: string } | null) => {
    if (error) throw new Error(error.message);
  };

  // Entra: categoria antes de seção.
  const categoriasNovas = mudados(antes.categories, agora.categories);
  if (categoriasNovas.length > 0) {
    check((await client.from("taxonomy_categories").upsert(categoriasNovas)).error);
  }

  const secoesNovas = mudados(antes.sections, agora.sections);
  if (secoesNovas.length > 0) {
    check((await client.from("taxonomy_sections").upsert(secoesNovas)).error);
  }

  const entradasNovas = mudados(antes.entries, agora.entries);
  if (entradasNovas.length > 0) {
    check((await client.from("taxonomy_entries").upsert(entradasNovas)).error);
  }

  // Sai: seção antes de categoria.
  const secoesFora = removidos(antes.sections, agora.sections);
  if (secoesFora.length > 0) {
    check((await client.from("taxonomy_sections").delete().in("id", secoesFora)).error);
  }

  const categoriasFora = removidos(antes.categories, agora.categories);
  if (categoriasFora.length > 0) {
    check((await client.from("taxonomy_categories").delete().in("id", categoriasFora)).error);
  }

  const entradasFora = removidos(antes.entries, agora.entries);
  if (entradasFora.length > 0) {
    check((await client.from("taxonomy_entries").delete().in("id", entradasFora)).error);
  }
}

/**
 * Semeia a estrutura do portal quando o banco está vazio.
 *
 * Devolve `true` se semeou. Só acontece na primeira vez: a partir daí o
 * cadastro é da equipe, e sobrescrever seria apagar o trabalho dela.
 */
export async function seedTaxonomyIfEmpty(
  client: Client,
  seed: Taxonomy
): Promise<boolean> {
  const { count, error } = await client
    .from("taxonomy_categories")
    .select("id", { count: "exact", head: true });

  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return false;

  const rows = fromTaxonomy(seed);

  /*
    `upsert` e não `insert`: em desenvolvimento o React executa efeitos duas
    vezes, e duas semeaduras simultâneas veriam a contagem zerada juntas. Com
    `insert`, a segunda quebraria na chave primária; com `upsert`, ela apenas
    reescreve o que a primeira já gravou.

    A ordem também importa: seção referencia categoria.
  */
  const categorias = await client.from("taxonomy_categories").upsert(rows.categories);
  if (categorias.error) throw new Error(categorias.error.message);

  const secoes = await client.from("taxonomy_sections").upsert(rows.sections);
  if (secoes.error) throw new Error(secoes.error.message);

  const entradas = await client.from("taxonomy_entries").upsert(rows.entries);
  if (entradas.error) throw new Error(entradas.error.message);

  return true;
}
