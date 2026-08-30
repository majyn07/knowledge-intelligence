import { z } from "zod";

import { jsonDoModelo } from "../parsers/jsonDoModelo";

/**
 * "Estes dois deveriam ser um só?"
 *
 * A tela de comparação já dizia o vocabulário em comum, e dizia também que
 * aquilo **não é veredito**: dois artigos citam "licença" e respondem dúvidas
 * diferentes. Para saber se dizem a mesma coisa ela mandava abrir um deles e
 * perguntar à IA de lá — o que é mandar alguém para outra tela no meio da
 * decisão, e é o que faz ninguém perguntar.
 *
 * Aqui a IA lê **os dois** e responde a pergunta que a tela existe para
 * responder: o que este tem que aquele não tem, e o que fazer com isso.
 *
 * Ela não funde nada. Unir, arquivar ou deixar como está continua sendo decisão
 * de quem revisa, pela mesma regra da análise do atendimento.
 */

/** Quanto de cada artigo vai. Os dois inteiros passariam de qualquer teto útil. */
export const TEXTO_NO_PEDIDO = 14_000;

const artigoSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    summary: z.string(),
    text: z.string().max(TEXTO_NO_PEDIDO),
    /* Cortado avisa a tela e o modelo: veredito sobre meio artigo é erro que ninguém vê. */
    truncated: z.boolean(),
  })
  .strict();

export const mergeRequestSchema = z.object({ a: artigoSchema, b: artigoSchema }).strict();

export type MergeRequest = z.infer<typeof mergeRequestSchema>;

/**
 * O veredito.
 *
 * Três, e não dois: "complementares" é o caso mais comum e o mais útil — dois
 * artigos que tratam do mesmo assunto por ângulos diferentes, onde unir perderia
 * conteúdo e deixar como está deixa quem procura achando só um dos dois.
 */
export const RELACOES = ["mesmo-assunto", "complementares", "assuntos-diferentes"] as const;

export type Relacao = (typeof RELACOES)[number];

export const mergeResponseSchema = z
  .object({
    relacao: z.enum(RELACOES),
    /** Por que, em prosa, para quem vai decidir. */
    motivo: z.string().min(1),
    /**
     * Qual dos dois sobreviveria, quando faz sentido unir.
     *
     * Identificador, conferido na volta como em toda a fronteira: artigo que o
     * modelo inventou vira ausência, não recomendação.
     */
    manter: z.string().nullable(),
    /** O que o outro tem que o mantido não tem, e portanto precisa ser levado junto. */
    levarJunto: z.array(z.string()).max(12),
    /** O que fazer, em uma linha. */
    recomendacao: z.string().min(1),
  })
  .strict();

export type MergeAdvice = z.infer<typeof mergeResponseSchema>;

export function getMergeJsonSchema() {
  const contrato: Record<string, unknown> = z.toJSONSchema(mergeResponseSchema);
  /* `$schema` declara o dialeto, e o modelo o devolveria como se fosse campo. */
  delete contrato.$schema;

  return contrato;
}

/**
 * A leitura da resposta.
 *
 * O identificador é conferido contra os dois que foram no pedido: o modelo
 * recomendando manter um artigo que não existe é pior que ele não recomendar
 * nada, porque a tela mostraria um nome que ninguém acha.
 */
export function parseMergeAdvice(bruto: string, ids: string[]): MergeAdvice {
  const advice = mergeResponseSchema.parse(jsonDoModelo(bruto));

  return {
    ...advice,
    manter: advice.manter !== null && ids.includes(advice.manter) ? advice.manter : null,
  };
}
