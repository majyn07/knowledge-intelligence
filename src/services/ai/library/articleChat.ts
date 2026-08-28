import { z } from "zod";

/**
 * Consultar a IA sobre o artigo que está aberto.
 *
 * A pergunta que isto responde é a de quem **avalia** o acervo: este artigo
 * ainda vale? falta alguma coisa? cobre o caso que o cliente relatou? Com mil e
 * oitocentos artigos importados, essa leitura crítica é o trabalho — e fazê-la
 * sozinho significa reler cada texto inteiro.
 *
 * A evidência é o próprio artigo, e só ele. Perguntas sobre o acervo inteiro
 * são outra ferramenta: quem responde "o que o acervo está pedindo" é o
 * Levantamento, que mede em vez de opinar.
 */

/**
 * Teto do texto enviado.
 *
 * O artigo mais longo do portal tem vinte e dois mil caracteres; a média fica
 * perto de doze mil. O teto existe para o caso fora da curva não estourar o
 * prazo do provedor — e quando ele corta, **a tela diz**, porque uma resposta
 * baseada em meio artigo apresentada como se fosse sobre o artigo inteiro é o
 * tipo de erro que ninguém percebe.
 */
export const MAXIMO_DE_CARACTERES = 24_000;

export const articleChatRequestSchema = z.object({
  article: z.object({
    title: z.string().min(1),
    summary: z.string(),
    /** Texto já limpo de marcação: o modelo não deve gastar contexto com HTML. */
    text: z.string().min(1).max(MAXIMO_DE_CARACTERES),
    sectionPath: z.string(),
    status: z.string(),
    updatedAt: z.string(),
    /** Verdadeiro quando o texto foi cortado no teto acima. */
    truncated: z.boolean(),
  }),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1)
    /*
      A conversa inteira vai a cada pedido, porque o provedor não guarda estado.
      O teto evita que uma sessão longa cresça sem limite até estourar o prazo.
    */
    .max(20),
});

export type ArticleChatRequest = z.infer<typeof articleChatRequestSchema>;

/** Corta o texto no teto, avisando se cortou. */
export function boundArticleText(texto: string): { text: string; truncated: boolean } {
  if (texto.length <= MAXIMO_DE_CARACTERES) return { text: texto, truncated: false };

  return { text: texto.slice(0, MAXIMO_DE_CARACTERES), truncated: true };
}

/**
 * O que vale perguntar, para quem não sabe por onde começar.
 *
 * São perguntas de **avaliação**, não de leitura: quem abriu o artigo já pode
 * lê-lo. O valor está em conferir o que um olho cansado deixa passar.
 */
export const PERGUNTAS_SUGERIDAS = [
  "Resuma este artigo em três pontos.",
  "O que falta neste artigo para ele resolver o problema sozinho?",
  "Há alguma instrução aqui que pareça desatualizada?",
  "Este artigo está na seção certa?",
  "Que dúvidas um cliente ainda teria depois de ler isto?",
] as const;
