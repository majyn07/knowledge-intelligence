import type { ArticleStatus } from "@/models/KnowledgeArticle";

import type { PortalState } from "../portalSync";

export interface LibraryFilters {
  search: string;
  status: ArticleStatus | "all";
  /**
   * Categoria do cadastro, não texto de produto. `unset` isola os artigos sem
   * seção: os que a migração não conseguiu encaixar e os recém-criados.
   */
  categoryId: string | "all" | "unset";
  /**
   * Em relação ao portal: o que falta levar para lá. É fila de trabalho, e vive
   * na URL para o achado do Levantamento apontar direto para ela.
   */
  portal: PortalState | "all";
}
