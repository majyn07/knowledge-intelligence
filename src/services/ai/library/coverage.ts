import { z } from "zod";

import { jsonDoModelo } from "../parsers/jsonDoModelo";

/**
 * O acervo já responde isto?
 *
 * É a pergunta que originou o produto, feita no momento em que ela importa: na
 * hora de escrever. O formulário já avisava sobre duplicata, mas por
 * **vocabulário** — "estes cinco têm palavras parecidas, 34% de proximidade".
 * Palavra em comum não é a mesma dúvida, e o próprio produto diz isso em todo
 * lugar onde calcula semelhança. Concluir que o assunto já está coberto exige
 * ler e comparar sentido, e é o que um modelo faz.
 *
 * O aviso léxico continua: ele é instantâneo, roda a cada tecla e não custa
 * nada. Esta avaliação é o passo seguinte, pedido por quem está escrevendo.
 *
 * **E quando não existe, ela escreve o rascunho com o acervo à vista.** Escrever
 * do zero produz um artigo que não se parece com os outros 1.822: outra
 * estrutura, outro tom, outra ordem de seções. Os modelos são os artigos da
 * mesma seção — o mais próximo em assunto, saindo da taxonomia que já existe,
 * sem inventar um cadastro de "artigos exemplares" que ninguém manteria.
 *
 * Nada é aplicado sozinho. A IA propõe, a revisão aprova — a mesma regra da
 * sugestão de seção e da análise do atendimento.
 */

/** Quanto do que se quer escrever o acervo já responde. */
export const COBERTURA = ["coberta", "parcial", "ausente"] as const;
export type NivelDeCobertura = (typeof COBERTURA)[number];

const artigoCandidatoSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    summary: z.string(),
    /** Recorte do conteúdo. O artigo inteiro não cabe, e não precisa. */
    excerpt: z.string(),
  })
  .strict();

/**
 * Quantos artigos da seção vão como modelo.
 *
 * Três bastam para o formato aparecer e não estouram o pedido: o que se quer é
 * a forma, não o conteúdo deles.
 */
export const MODELOS_NO_PEDIDO = 3;

/** Quantos candidatos a IA lê. Acima disto o pedido cresce sem melhorar o juízo. */
export const CANDIDATOS_NO_PEDIDO = 5;

export const coverageRequestSchema = z
  .object({
    /** O que a pessoa quer documentar, nas palavras dela. */
    material: z.string().min(1).max(60_000),
    /**
     * Os artigos que o acervo tem sobre isto, já escolhidos aqui.
     *
     * A busca roda no navegador, onde o acervo vive: o servidor recebe a
     * evidência resolvida em vez de tentar ler uma base à qual não tem acesso.
     * É o mesmo caminho da análise do atendimento.
     */
    candidatos: z.array(artigoCandidatoSchema).max(CANDIDATOS_NO_PEDIDO),
    /** Artigos da seção de destino, para o rascunho sair na forma do acervo. */
    modelos: z
      .array(
        z
          .object({
            title: z.string().min(1),
            summary: z.string(),
            excerpt: z.string(),
          })
          .strict()
      )
      .max(MODELOS_NO_PEDIDO),
  })
  .strict();

export type CoverageRequest = z.infer<typeof coverageRequestSchema>;

export const coverageResponseSchema = z
  .object({
    cobertura: z.enum(COBERTURA),
    /** Uma frase dizendo por quê. É o que torna o veredito revisável. */
    motivo: z.string().min(1),
    /**
     * O que cada artigo já responde e o que falta nele.
     *
     * Vazio quando a cobertura é `ausente`. Com `parcial`, é aqui que está a
     * decisão de verdade: atualizar um destes costuma valer mais que escrever
     * um novo, e o produto inteiro prefere atualizar.
     */
    artigos: z.array(
      z
        .object({
          id: z.string().min(1),
          jaCobre: z.string(),
          falta: z.string(),
        })
        .strict()
    ),
    /**
     * O rascunho, quando vale escrever.
     *
     * Ausente quando a cobertura é `coberta`: propor um artigo novo sobre algo
     * que o acervo já responde é o oposto do que esta tela serve para evitar.
     */
    rascunho: z
      .object({
        title: z.string().min(1),
        summary: z.string().min(1),
        content: z.string().min(1),
      })
      .strict()
      .optional(),
  })
  .strict();

export type CoverageResult = z.infer<typeof coverageResponseSchema>;

/**
 * O contrato como o provedor o vê, sem o cabeçalho do formato.
 *
 * `z.toJSONSchema` acrescenta `$schema`, que é metadado do documento e não
 * campo da resposta — e o modelo, mostrado o objeto, devolvia `$schema` junto.
 * É a mesma armadilha que já derrubou a análise do atendimento.
 */
export function getCoverageJsonSchema() {
  const contrato: Record<string, unknown> = z.toJSONSchema(coverageResponseSchema);
  delete contrato.$schema;

  return contrato;
}

/**
 * Lê a resposta e **confere os identificadores na volta**.
 *
 * Instrução não é garantia: artigo que o modelo inventou vira ausência, não
 * referência. É a mesma conferência da sugestão de seção — sem ela, a tela
 * ofereceria um link para um artigo que não existe.
 */
export function parseCoverage(raw: unknown, request: CoverageRequest): CoverageResult | null {
  const bruto = typeof raw === "string" ? jsonDoModelo(raw) : raw;
  const lido = coverageResponseSchema.safeParse(bruto);

  if (!lido.success) return null;

  const conhecidos = new Set(request.candidatos.map((artigo) => artigo.id));

  const artigos = lido.data.artigos.filter((artigo) => conhecidos.has(artigo.id));

  /*
    Sem artigo reconhecido, "coberta" não se sustenta: o veredito dependia de
    apontar qual artigo cobre, e sem isso ele vira uma afirmação sem evidência.
    Cair para `ausente` é o lado certo do erro — quem escreve confere, e um
    rascunho a mais custa menos que um artigo que não foi escrito.
  */
  const cobertura =
    lido.data.cobertura !== "ausente" && artigos.length === 0 ? "ausente" : lido.data.cobertura;

  return { ...lido.data, cobertura, artigos };
}
