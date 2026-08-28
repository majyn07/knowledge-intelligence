import { articleStatusLabel, type KnowledgeArticle } from "@/models/KnowledgeArticle";
import { sectionPath, type Taxonomy } from "@/models/Taxonomy";

/**
 * A Biblioteca como tabela.
 *
 * A grade de cartões responde "o que tem aqui" e funciona com trinta artigos.
 * O acervo espelhado terá cerca de 1.800, e aí a pergunta muda para "onde está
 * este, e o que falta nele", que é uma pergunta de tabela: muitas linhas,
 * poucas colunas, ordenável por qualquer uma.
 *
 * As duas convivem. Trocar a grade pela tabela responderia a segunda pergunta
 * e perderia a primeira.
 */

export const ARTICLE_COLUMNS = [
  "title",
  "status",
  "section",
  "genre",
  "author",
  "updatedAt",
] as const;

export type ArticleColumn = (typeof ARTICLE_COLUMNS)[number];

export const columnLabel: Record<ArticleColumn, string> = {
  title: "Título",
  status: "Estágio",
  section: "Seção",
  genre: "Gênero",
  author: "Responsável",
  updatedAt: "Atualizado",
};

/**
 * Colunas que não podem ser escondidas.
 *
 * Sem o título a linha deixa de identificar o registro, e a tabela vira um
 * conjunto de atributos sem sujeito.
 */
export const REQUIRED_COLUMNS: ArticleColumn[] = ["title"];

export const defaultColumns: ArticleColumn[] = [
  "title",
  "status",
  "section",
  "author",
  "updatedAt",
];

export type SortDirection = "asc" | "desc";

export interface Sort {
  column: ArticleColumn;
  direction: SortDirection;
}

export interface ColumnContext {
  taxonomy: Taxonomy;
  /** Resolve a atribuição para o nome de hoje. */
  nameOf: (ref: string) => string;
}

/**
 * O valor de uma coluna, como texto.
 *
 * Serve para exibir, ordenar e exportar com o mesmo resultado. Três lugares
 * que, escritos em separado, divergem. Foi o que aconteceu com o rótulo do
 * estágio da análise, que existia em duas cópias.
 */
export function cellValue(
  article: KnowledgeArticle,
  column: ArticleColumn,
  context: ColumnContext
): string {
  switch (column) {
    case "title":
      return article.title;
    case "status":
      return articleStatusLabel[article.status];
    case "section":
      return sectionPath(context.taxonomy, article.sectionId);
    case "genre":
      return context.taxonomy.genres.find((genre) => genre.id === article.genreId)?.name ?? "";
    case "author":
      return context.nameOf(article.author);
    case "updatedAt":
      return article.updatedAt instanceof Date ? article.updatedAt.toISOString() : "";
  }
}

/**
 * Ordena por uma coluna.
 *
 * Data compara como instante e o resto como texto em pt-BR. Comparar data
 * como texto funcionaria só enquanto o formato fosse ISO, e quebraria em
 * silêncio no dia em que deixasse de ser.
 *
 * Vazio vai sempre para o fim, nas duas direções. Ordenar por responsável para
 * encontrar quem falta atribuir é o caso real, e não faz sentido a lista de
 * "sem responsável" mudar de ponta conforme a seta.
 */
export function sortArticles(
  articles: KnowledgeArticle[],
  sort: Sort,
  context: ColumnContext
): KnowledgeArticle[] {
  const factor = sort.direction === "asc" ? 1 : -1;

  return [...articles].sort((a, b) => {
    const left = cellValue(a, sort.column, context);
    const right = cellValue(b, sort.column, context);

    if (left === "" && right === "") return 0;
    if (left === "") return 1;
    if (right === "") return -1;

    if (sort.column === "updatedAt") {
      return factor * (new Date(left).getTime() - new Date(right).getTime());
    }

    return factor * left.localeCompare(right, "pt-BR");
  });
}

export interface Page<T> {
  items: T[];
  page: number;
  pages: number;
  total: number;
}

/**
 * Uma página da lista.
 *
 * Página e não rolagem infinita: com 1.800 linhas a rolagem esconde onde a
 * pessoa está e impede voltar ao mesmo ponto. E página não exige biblioteca
 * nova no projeto, virtualizar exigiria.
 *
 * Página fora do intervalo é corrigida em vez de devolver vazio: filtrar
 * enquanto se está na página 7 deixaria a tela em branco com registros logo
 * ali.
 */
export function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * size;

  return {
    items: items.slice(start, start + size),
    page: current,
    pages,
    total: items.length,
  };
}
