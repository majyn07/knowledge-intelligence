import type { AIChatMessage } from "@/models/AIChatMessage";

import type { ArticleChatRequest } from "../library/articleChat";

/**
 * O prompt da consulta sobre um artigo.
 *
 * Fica aqui, e não dentro do provedor, porque é assunto do produto: o que a IA
 * pode e não pode dizer sobre o acervo da AltoQi é decisão nossa, não do SDK.
 */

/**
 * A instrução central é a mesma regra do resto do produto: **nada inventado**.
 *
 * Um modelo perguntado sobre um artigo técnico responde com o que sabe de
 * treinamento se o artigo não disser, e a resposta chega com a mesma cara de
 * quem leu o texto. Quem avalia o acervo não tem como distinguir, e passaria a
 * confiar numa informação que não está publicada em lugar nenhum.
 *
 * Por isso a única fonte é o artigo, e "o artigo não diz" é resposta boa.
 *
 * Mas a regra precisou de uma distinção que a primeira versão não tinha, e o
 * teste contra o modelo real mostrou por quê: perguntado "resuma este artigo",
 * ele abria com "o artigo não trata disso" e só então resumia. Pergunta
 * **sobre** o artigo (resumir, avaliar, apontar lacuna) se responde com o
 * texto em mãos; a recusa vale para pergunta **respondida pelo** artigo, que é
 * onde inventar faria estrago.
 */
const SISTEMA = `
Você ajuda a equipe de suporte da AltoQi a avaliar artigos da base de
conhecimento publicada em suporte.altoqi.com.br.

Há dois tipos de pergunta, e eles se respondem de formas diferentes:

**Sobre o artigo**. Resumir, apontar o que falta, avaliar se está atualizado,
dizer se a seção é adequada, imaginar que dúvidas sobram. Responda direto: a
matéria-prima é o texto que você recebeu, e ela basta. Nunca comece dizendo
que o artigo não trata do assunto: a pergunta é sobre ele.

**Respondida pelo artigo**, dúvidas técnicas sobre o produto. Aqui vale a
regra dura: responda somente com o que está escrito, e quando não estiver,
responda apenas "o artigo não trata disso" e pare. Não complete com
conhecimento geral sobre AltoQi Builder, Eberick ou Visus: a resposta chegaria
com a mesma cara de quem leu o texto, e quem avalia o acervo não teria como
distinguir.

Em qualquer um dos dois:

1. Não invente número, versão, nome de comando, caminho de menu ou mensagem de
   erro que não esteja escrito no artigo.
2. Uma lacuna identificada vale mais que um preenchimento plausível.
3. Você **avalia e sugere**; quem decide e edita é a pessoa. Nunca escreva como
   se a alteração já tivesse sido feita.
4. Responda em português do Brasil, direto, sem preâmbulo. Use Markdown simples
   quando ajudar a ler, listas curtas, negrito para o essencial.
`.trim();

function contexto(article: ArticleChatRequest["article"]): string {
  const ressalva = article.truncated
    ? "\n\nATENÇÃO: o texto abaixo foi cortado por ser muito longo. Se a resposta " +
      "depender do que pode estar na parte cortada, diga isso."
    : "";

  return `
# ARTIGO EM AVALIAÇÃO

Título: ${article.title}
Seção: ${article.sectionPath || "sem seção"}
Estágio: ${article.status}
Atualizado em: ${article.updatedAt || "não informado"}

Resumo publicado:
${article.summary || "(o artigo não tem resumo)"}

Conteúdo:
${article.text}${ressalva}
`.trim();
}

export function buildArticleChatPrompt(request: ArticleChatRequest): AIChatMessage[] {
  return [
    { role: "system", content: SISTEMA },
    { role: "system", content: contexto(request.article) },
    ...request.messages.map((mensagem) => ({
      role: mensagem.role,
      content: mensagem.content,
    })),
  ];
}
