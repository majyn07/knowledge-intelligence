/**
 * Qual coluna do arquivo alimenta qual campo do artigo.
 *
 * A exportação da HubSpot não vai usar os nossos nomes, e o mapeamento é uma
 * tela — não uma adivinhação. O que esta camada faz é **sugerir**, com a mesma
 * regra do resto do produto: reconhece o que dá para reconhecer e deixa vazio
 * o que não dá, em vez de encaixar no mais parecido.
 *
 * Encaixar por semelhança seria a classificação inventada que o produto
 * recusa, e aqui com agravante: erro de mapeamento contamina mil e oitocentos
 * registros de uma vez, e ninguém olha um por um para descobrir.
 */

export const IMPORT_FIELDS = [
  "title",
  "summary",
  "content",
  "sectionName",
  "categoryName",
  "portalArticleId",
  "url",
  "author",
  "keywords",
  "status",
  "updatedAt",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Coluna escolhida por campo. Índice na tabela, ou `null` para "não importar". */
export type ColumnMapping = Record<ImportField, number | null>;

export const importFieldLabel: Record<ImportField, string> = {
  title: "Título",
  summary: "Resumo",
  content: "Conteúdo",
  sectionName: "Seção",
  categoryName: "Categoria",
  portalArticleId: "Identificador no portal",
  url: "Endereço público",
  author: "Responsável",
  keywords: "Palavras-chave",
  status: "Estágio",
  updatedAt: "Atualizado em",
};

/** Sem título não há registro: é o único campo que a importação exige. */
export const REQUIRED_FIELDS: ImportField[] = ["title"];

/**
 * Nomes que reconhecemos, em minúsculas e sem acento.
 *
 * A lista é de correspondência **exata** de propósito. "nome" casaria com
 * "nome do autor" numa comparação por trecho, e o resultado seria mil e
 * oitocentos artigos intitulados com o nome de quem escreveu.
 */
const KNOWN: Record<ImportField, string[]> = {
  title: ["titulo", "title", "nome", "name", "assunto", "headline"],
  summary: ["resumo", "summary", "descricao", "description", "subtitulo", "meta description"],
  content: ["conteudo", "content", "corpo", "body", "texto", "article body", "html"],
  sectionName: ["secao", "section", "subcategoria", "subcategory", "subcategoria do artigo"],
  categoryName: ["categoria", "category", "produto", "product"],
  portalArticleId: ["id", "article id", "id do artigo", "identificador", "portal id", "record id"],
  url: ["url", "link", "endereco", "permalink", "public url"],
  author: ["autor", "author", "responsavel", "owner", "equipe", "team"],
  keywords: ["palavras-chave", "keywords", "tags", "termos"],
  status: ["estagio", "status", "estado", "state", "situacao"],
  updatedAt: ["atualizado em", "updated at", "last updated", "data de atualizacao", "modificado em"],
};

/** Minúsculas, sem acento e sem espaço sobrando — só para comparar. */
export function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function emptyMapping(): ColumnMapping {
  return Object.fromEntries(IMPORT_FIELDS.map((field) => [field, null])) as ColumnMapping;
}

/**
 * Sugere o mapeamento a partir dos cabeçalhos.
 *
 * Uma coluna alimenta **um** campo: se dois campos reconhecem o mesmo
 * cabeçalho, fica com o primeiro da ordem de `IMPORT_FIELDS`, e o outro
 * continua vazio para alguém escolher. Duplicar a coluna gravaria o mesmo
 * texto em dois lugares sem ninguém pedir.
 */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping = emptyMapping();
  const usadas = new Set<number>();
  const normalizados = headers.map(normalizeHeader);

  for (const field of IMPORT_FIELDS) {
    const indice = normalizados.findIndex(
      (header, i) => !usadas.has(i) && KNOWN[field].includes(header)
    );

    if (indice >= 0) {
      mapping[field] = indice;
      usadas.add(indice);
    }
  }

  return mapping;
}

export function mappingIsComplete(mapping: ColumnMapping): boolean {
  return REQUIRED_FIELDS.every((field) => mapping[field] !== null);
}
