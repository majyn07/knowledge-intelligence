/**
 * O trecho do artigo onde o termo aparece.
 *
 * Buscar no corpo sem mostrar o trecho é meio recurso: a lista diz que oito
 * artigos casam e não diz por quê, e a pessoa abre os oito. Com o trecho, ela
 * abre o certo. Que é a diferença entre a busca ajudar e a busca dar trabalho.
 */

/** Tira o acento preservando o tamanho, para o índice do texto continuar valendo. */
export function foldText(texto: string): string {
  return [...texto]
    .map((caractere) => {
      const base = caractere.normalize("NFD").replace(/[̀-ͯ]/g, "");
      return base.length === 1 ? base : caractere;
    })
    .join("")
    .toLowerCase();
}

export interface ArticleExcerpt {
  before: string;
  match: string;
  after: string;
}

/**
 * O pedaço em volta da primeira ocorrência.
 *
 * Devolve as três partes separadas, e não HTML: quem exibe monta o destaque com
 * um elemento de verdade. Devolver marcação obrigaria a injetar HTML num cartão
 * de lista, o que é superfície de risco por conveniência de quem escreve.
 */
export function excerptAround(
  texto: string,
  termo: string,
  raio = 90
): ArticleExcerpt | null {
  const alvo = foldText(termo.trim());
  if (alvo.length < 2) return null;

  const dobrado = foldText(texto);
  const em = dobrado.indexOf(alvo);
  if (em === -1) return null;

  const inicio = Math.max(0, em - raio);
  const fim = Math.min(texto.length, em + alvo.length + raio);

  /*
    Corta na palavra inteira quando não é o começo do texto: um trecho que
    começa no meio de "dimensionamento" faz quem lê tropeçar antes de chegar ao
    que interessa.
  */
  const recuo = inicio === 0 ? 0 : texto.slice(inicio, em).search(/\s/) + 1;

  const before = (inicio === 0 ? "" : "…") + texto.slice(inicio + recuo, em);
  const match = texto.slice(em, em + alvo.length);
  const after = texto.slice(em + alvo.length, fim) + (fim < texto.length ? "…" : "");

  return { before, match, after };
}
