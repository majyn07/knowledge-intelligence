import type { Taxonomy } from "@/models/Taxonomy";

/** Vazio representa "não definido" no campo de produto do projeto. */
export const UNSET_PRODUCT = "";

/**
 * Produtos disponíveis para um projeto, lidos do cadastro.
 *
 * Antes era lista fixa no código, o que permitia que o formulário do projeto e
 * o da Biblioteca discordassem sobre quais produtos existem. Agora as duas
 * telas leem a mesma fonte, e produto criado no cadastro aparece nas duas.
 *
 * Só as categorias de linha de produto entram: as áreas de apoio do portal
 * publicam artigo, mas nenhum projeto é conduzido "dentro" delas.
 */
export function productNamesFrom(taxonomy: Taxonomy): string[] {
  return taxonomy.categories
    .filter((category) => category.isProduct)
    .map((category) => category.name);
}
