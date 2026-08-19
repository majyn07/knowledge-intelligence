/**
 * Produtos AltoQi disponíveis para um projeto.
 *
 * Lista controlada para que o campo sirva a filtro e agrupamento, e para
 * falar a mesma língua da taxonomia usada no atendimento e nos artigos.
 * Vazio representa "não definido".
 */
export const PROJECT_PRODUCTS = [
  "AltoQi Visus",
  "AltoQi Builder",
  "AltoQi Eberick",
] as const;

export const UNSET_PRODUCT = "";

export type ProjectProduct = (typeof PROJECT_PRODUCTS)[number];
