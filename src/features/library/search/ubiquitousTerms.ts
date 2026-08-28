import { deacentuar } from "@/lib/vocabulary";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { articleText } from "../content/articleText";

/**
 * As palavras que aparecem em quase todo artigo, medidas do acervo.
 *
 * Uma lista escrita à mão não dá conta disto. A busca por artigos relacionados
 * recebe a conversa inteira do atendimento, oitenta mensagens, e ali aparece
 * todo o português: "você", "poderá", "conferir", "selecione", "importante",
 * "processo". Cada uma casa com algum artigo, e a tela apresentava sessenta
 * dessas como o motivo de um artigo ser relacionado.
 *
 * Enumerar palavra comum de português é lista sem fim, e o produto já tem três
 * listas assim de propósito curtas. Esta é medida: um termo que está em um
 * quarto do acervo não distingue artigo nenhum, e isso o próprio acervo diz.
 * Quando o portal mudar, a medição muda junto, sem ninguém abrir o código.
 */

/**
 * Acima disto o termo é do acervo, não do assunto.
 *
 * O número foi medido contra os 1.822 artigos publicados: 15.105 termos
 * distintos, e **119** passam de um quarto. É um bisturi, não um martelo, e o
 * que ele pega é exatamente o que aparecia como motivo de um artigo ser
 * relacionado: "para" em 99%, "que" em 98%, "como" em 95%, "projeto" em 76%,
 * "acesse" em 60%, "selecione" em 50%.
 *
 * A fronteira dos 25% custa alguns termos de engenharia junto, "croqui" e
 * "pavimento" entre eles. É o lado certo do erro: um termo que está em
 * quinhentos artigos não estreita busca nenhuma, e deixá-lo passar devolve a
 * parede de palavras que a medição veio desfazer.
 *
 * `nbsp` aparece em 99%, e isso é outra coisa: é `&nbsp;` escapando da limpeza
 * do HTML. A medição o descarta junto, mas a origem continua lá.
 */
export const LIMIAR_DE_ONIPRESENCA = 0.25;

/** Abaixo disto não há acervo para medir, e medir mediria ruído. */
const MINIMO_PARA_MEDIR = 40;

/*
  Medido uma vez por acervo, e não por busca.

  A conta é uma passada sobre os 1.822 artigos, e a busca por relacionados roda
  a cada atendimento aberto. `WeakMap` na própria lista: o provider mantém a
  identidade do array entre mudanças, então a segunda abertura não paga nada, e
  quando o acervo muda a chave muda junto e a medição se refaz sozinha.
*/
const medido = new WeakMap<readonly KnowledgeArticle[], Set<string>>();

/**
 * Tokenização permissiva de propósito.
 *
 * `termsOf` já descarta o que é curto, e é justamente o curto que precisa ser
 * medido aqui: "você", "mas", "qual" e "tipo" têm menos de cinco letras e são o
 * grosso do ruído. A decisão de descartar é da medição, não do tamanho.
 */
function palavrasDe(texto: string): Set<string> {
  return new Set(
    deacentuar(texto)
      .split(/[^a-z0-9]+/)
      .filter((palavra) => palavra.length > 2)
  );
}

export function termosOnipresentes(
  articles: readonly KnowledgeArticle[],
  limiar = LIMIAR_DE_ONIPRESENCA
): Set<string> {
  const guardado = medido.get(articles);

  if (guardado) return guardado;

  const publicados = articles.filter((article) => article.status === "published");
  const onipresentes = new Set<string>();

  /*
    Acervo pequeno não tem o que medir: com dez artigos, qualquer palavra que
    apareça em três passa do limiar, e a busca ficaria sem vocabulário nenhum.
    Melhor devolver vazio e deixar a busca casar de mais que emudecê-la.
  */
  if (publicados.length < MINIMO_PARA_MEDIR) {
    medido.set(articles, onipresentes);
    return onipresentes;
  }

  const emQuantos = new Map<string, number>();

  for (const article of publicados) {
    const palavras = palavrasDe(`${article.title} ${article.summary} ${articleText(article)}`);

    for (const palavra of palavras) {
      emQuantos.set(palavra, (emQuantos.get(palavra) ?? 0) + 1);
    }
  }

  const teto = publicados.length * limiar;

  for (const [palavra, quantos] of emQuantos) {
    if (quantos > teto) onipresentes.add(palavra);
  }

  medido.set(articles, onipresentes);

  return onipresentes;
}
