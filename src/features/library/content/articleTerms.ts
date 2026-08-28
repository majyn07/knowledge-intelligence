import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { articleText } from "./articleText";

/**
 * O vocabulário de um artigo — a base de toda comparação entre eles.
 *
 * Vive num lugar só porque duas listas do mesmo vocabulário divergem, e a
 * divergência apareceria como o Levantamento apontando um par que a tela de
 * comparação depois descreve de outro jeito.
 */

/**
 * Palavras que aparecem em quase todo artigo do portal.
 *
 * Sem esta lista, dois artigos quaisquer do Builder se parecem: os dois falam
 * de projeto, janela, comando e clique. O que distingue um artigo do outro é o
 * termo técnico, não o vocabulário da ferramenta.
 */
const COMUNS = new Set([
  "para", "com", "que", "dos", "das", "por", "uma", "nao", "como", "mais", "sem",
  "sobre", "pode", "ser", "esta", "este", "isso", "quando", "onde", "seu", "sua",
  "aos", "nas", "nos", "foi", "sao", "tem", "caso", "deve", "todos", "toda", "cada",
  "altoqi", "artigo", "builder", "eberick", "visus", "plataforma", "programa",
  "projeto", "usuario", "arquivo", "clique", "clicar", "opcao", "opcoes", "janela",
  "comando", "desenho", "tela", "menu", "botao", "figura", "abaixo", "acima",
  "seguir", "conforme", "atraves", "possivel", "necessario", "utilizar", "forma",
  "apresentado", "apresentada", "exemplo", "mostrado", "selecionar", "existe",
]);

/** Abaixo disso a palavra comum é curta demais para distinguir assunto. */
const TAMANHO_MINIMO = 5;

/**
 * Códigos entram mesmo sendo curtos — e essa regra veio da medição.
 *
 * Numa base técnica o que separa dois artigos vizinhos costuma ser justamente
 * um código curto: `D15` e `D16` são erros diferentes, `V9` e `V10` são versões
 * diferentes. Com o corte por tamanho, esses pares apareciam como **idênticos**,
 * porque o único termo que os distinguia era o descartado.
 *
 * O critério é misturar letra e dígito: é o formato de código de erro, versão e
 * norma, e não pega palavra comum nenhuma.
 */
const CODIGO = /^(?=.*[a-z])(?=.*\d)[a-z0-9]+$/;

export function isMeaningfulTerm(palavra: string): boolean {
  if (COMUNS.has(palavra)) return false;
  if (CODIGO.test(palavra)) return true;

  return palavra.length >= TAMANHO_MINIMO;
}

/** As palavras de um texto qualquer, já normalizadas. */
export function termsOf(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(isMeaningfulTerm);
}

/** O que um artigo diz, para efeito de comparação: título, resumo e corpo. */
function articleCorpus(article: KnowledgeArticle): string {
  return `${article.title} ${article.summary} ${articleText(article)}`;
}

export function articleVocabulary(article: KnowledgeArticle): Set<string> {
  return new Set(termsOf(articleCorpus(article)));
}

/**
 * As palavras de um artigo, com quantas vezes cada uma aparece.
 *
 * A contagem importa: um termo citado uma vez de passagem não é o assunto do
 * artigo, e listá-lo como "exclusivo" mandaria alguém preservar uma menção
 * solta achando que preserva conteúdo.
 */
export function articleTermFrequency(article: KnowledgeArticle): Map<string, number> {
  const contagem = new Map<string, number>();

  for (const palavra of termsOf(articleCorpus(article))) {
    contagem.set(palavra, (contagem.get(palavra) ?? 0) + 1);
  }

  return contagem;
}

/** Quanto do vocabulário dos dois é o mesmo, de 0 a 1. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let comuns = 0;
  const menor = a.size <= b.size ? a : b;
  const maior = menor === a ? b : a;

  for (const palavra of menor) if (maior.has(palavra)) comuns += 1;

  return comuns / (a.size + b.size - comuns);
}
