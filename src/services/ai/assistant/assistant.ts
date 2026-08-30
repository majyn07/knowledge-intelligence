import { z } from "zod";

/**
 * A conversa com a IA sobre a tela em que a pessoa está.
 *
 * Ela responde do **retrato factual** que a tela monta: contagens que o produto
 * derivou, os achados do Levantamento e uma amostra. Não recebe o acervo — são
 * 22 MB — e não deve fingir que recebeu.
 *
 * O contrato é estrito como o resto da fronteira de IA: nada além do que está
 * declarado atravessa, e o dia em que alguém acrescentar um campo ao retrato ele
 * entra aqui por decisão, e não por acidente. Foi assim que o registro cru do
 * atendimento vazou para o provedor uma vez.
 */

const fatoSchema = z.object({ rotulo: z.string().min(1), valor: z.string() }).strict();

const achadoSchema = z.object({ titulo: z.string().min(1), porque: z.string() }).strict();

export const assistantContextSchema = z
  .object({
    tela: z.string().min(1).max(300),
    alcance: z.string().min(1).max(600),
    fatos: z.array(fatoSchema).max(40),
    achados: z.array(achadoSchema).max(20),
    amostra: z.array(z.string()).max(30),
  })
  .strict();

export type AssistantContext = z.infer<typeof assistantContextSchema>;

export const assistantRequestSchema = z
  .object({
    context: assistantContextSchema,
    /**
     * O fio da conversa, para a pergunta seguinte fazer sentido.
     *
     * Com teto: uma conversa longa dentro de um painel flutuante custa o mesmo
     * que uma análise inteira, e o valor está nas últimas trocas.
     */
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1).max(4_000),
          })
          .strict()
      )
      .min(1)
      .max(20),
  })
  .strict();

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
