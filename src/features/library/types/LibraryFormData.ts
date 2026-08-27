import type { ArticleStatus, ContentFormat } from "@/models/KnowledgeArticle";

export interface LibraryFormData {
  title: string;
  summary: string;
  content: string;

  /**
   * Em que formato o corpo está.
   *
   * Anda junto do conteúdo porque o serviço gravava `"markdown"` cravado: abrir
   * e salvar um artigo do portal trocava o formato dele, e o HTML passava a ser
   * exibido como texto para sempre. O formato é do artigo, não do editor.
   */
  contentFormat: ContentFormat;

  projectId: string;

  /**
   * Identificadores do cadastro, não texto livre. Vazio é estado válido:
   * artigo novo antes de alguém classificar, ou migrado sem correspondência.
   */
  genreId: string;
  sectionId: string;

  status: ArticleStatus;

  tags: string[];
  keywords: string[];
  author: string;
  url: string;
}
