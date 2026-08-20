
/**
 * Esqueleto inicial por gênero.
 *
 * A chave é o **nome** do gênero, não um identificador: o gênero virou
 * cadastro, e quem cria um gênero novo não tem como registrar modelo aqui.
 * Nome conhecido traz o esqueleto; nome novo cai no modelo geral, que ainda é
 * melhor que uma página em branco.
 */
const templates: Record<string, string> = {
  Artigo: `## Problema

Descreva o sintoma como o cliente o relata.

## Causa

O que provoca o comportamento.

## Solução

1. Primeiro passo
2. Segundo passo

## Como validar

Como confirmar que o problema foi resolvido.`,

  FAQ: `## Pergunta

Como o cliente formula a dúvida.

**Resposta:** resposta direta, em uma ou duas frases.

## Pergunta

Outra dúvida frequente sobre o mesmo tema.

**Resposta:** resposta direta.`,

  Workflow: `## Quando usar

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

  Documento: `## Contexto

Por que este documento existe.

## Conteúdo

Desenvolva o assunto.

## Referências

- Referência`,

  Template: `## Como usar este modelo

Instruções de preenchimento.

## Modelo

Conteúdo a ser copiado e adaptado.`,
};

/** Modelo do gênero, ou o geral quando o gênero é novo ou não foi escolhido. */
export function templateFor(genreName: string): string {
  return templates[genreName] ?? templates.Artigo;
}
