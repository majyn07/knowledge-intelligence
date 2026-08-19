import type { ArticleType } from "@/models/KnowledgeArticle";

/**
 * Esqueleto inicial por tipo. O tipo deixa de ser apenas um rótulo e passa a
 * definir como o conteúdo começa estruturado.
 */
export const articleTemplates: Record<ArticleType, string> = {
  article: `## Problema

Descreva o sintoma como o cliente o relata.

## Causa

O que provoca o comportamento.

## Solução

1. Primeiro passo
2. Segundo passo

## Como validar

Como confirmar que o problema foi resolvido.`,

  faq: `## Pergunta

Como o cliente formula a dúvida.

**Resposta:** resposta direta, em uma ou duas frases.

## Pergunta

Outra dúvida frequente sobre o mesmo tema.

**Resposta:** resposta direta.`,

  workflow: `## Quando usar

Situação em que este fluxo se aplica.

## Pré-requisitos

- Requisito
- Requisito

## Passo a passo

1. Primeira etapa
2. Segunda etapa
3. Terceira etapa

## Resultado esperado

O que deve acontecer ao final.`,

  document: `## Contexto

Por que este documento existe.

## Conteúdo

Desenvolva o assunto.

## Referências

- Referência`,

  template: `## Como usar este modelo

Instruções de preenchimento.

## Modelo

Conteúdo a ser copiado e adaptado.`,
};
