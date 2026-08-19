/**
 * Categorias do artigo, alinhadas aos prefixos que a AltoQi já usa nos títulos
 * do portal de suporte ("Troubleshooting | ...", "Passos iniciais | ...").
 * Descrevem que tipo de ajuda o artigo oferece.
 */
export const ARTICLE_CATEGORIES = [
  "Passos iniciais",
  "Utilização",
  "Configurações",
  "Troubleshooting",
  "Integração",
  "Administração",
  "Conceitos",
] as const;

export const UNSET_CATEGORY = "";

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];
