import { z } from "zod";

import { ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from "@/models/AIAttachment";

/**
 * Preencher um formulário a partir do que alguém escreveu ou anexou.
 *
 * Existe porque o cadastro do produto é digitação: quem abre um projeto já
 * sabe o que quer e precisa distribuir isso por sete campos, e quem importa um
 * atendimento tem a informação num documento que ninguém vai transcrever.
 *
 * É genérico de propósito. O formato "descreva e a IA propõe os campos" é o
 * mesmo no projeto, no atendimento e no artigo — escrever um serviço por tela
 * faria três prompts divergirem e três lugares para consertar a mesma regra.
 * Quem conhece o vocabulário é quem chama: manda os campos, recebe valores
 * para eles, e nada mais.
 *
 * **A IA propõe, a revisão aprova.** O resultado daqui não grava nada: ele
 * chega ao formulário como preenchimento sugerido, editável e descartável,
 * como manda a regra do produto.
 */

export const FIELD_KINDS = ["texto", "escolha", "lista"] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

/** Uma coluna de um campo de lista. Sem catálogo: é transcrição, não escolha. */
export const itemFieldSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().min(1),
    hint: z.string().optional(),
  })
  .strict();

export type ItemField = z.infer<typeof itemFieldSchema>;

/** Teto de itens por lista. Documento longo não vira mil mensagens no formulário. */
export const MAX_LIST_ITEMS = 60;

/**
 * A descrição de um campo, como o formulário o conhece.
 *
 * `options` é o que separa este serviço de um gerador de texto: campo de
 * escolha só aceita valor do catálogo que veio no pedido. Sem isso o modelo
 * devolve "Eberick 2024" para um produto chamado "Eberick", e a tela precisa
 * decidir sozinha entre gravar errado e ignorar em silêncio.
 *
 * `lista` existe porque parte do que se extrai de um documento **não é um
 * valor, é uma sequência** — a conversa de um atendimento é a evidência que a
 * análise lê depois, e é o grosso do que um PDF de chamado carrega. Deixá-la
 * de fora fazia a importação por documento entregar a moldura e perder o
 * conteúdo.
 *
 * Transcrever não é inventar: o que entra é o que está escrito no documento, e
 * passa pela mesma revisão de todo o resto antes de virar registro.
 */
export const fieldSpecSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().min(1),
    kind: z.enum(FIELD_KINDS),
    /** Só para `escolha`. O valor proposto tem de sair daqui. */
    options: z.array(z.string().min(1)).optional(),
    /** Só para `lista`. As colunas de cada item. */
    itemFields: z.array(itemFieldSchema).min(1).max(8).optional(),
    /** O que o campo espera, em uma linha. Vai para o prompt. */
    hint: z.string().optional(),
  })
  .strict();

export type FieldSpec = z.infer<typeof fieldSpecSchema>;

export const attachmentSchema = z
  .object({
    mimeType: z.enum(ATTACHMENT_TYPES),
    /** Conteúdo em base64, sem o prefixo `data:`. */
    data: z.string().min(1).max(Math.ceil(MAX_ATTACHMENT_BYTES * 1.4)),
  })
  .strict();

export const fieldFillRequestSchema = z
  .object({
    /** O que o formulário é, em uma frase. Ancora o modelo no domínio. */
    subject: z.string().min(1).max(200),
    fields: z.array(fieldSpecSchema).min(1).max(30),
    /**
     * O texto livre: o que a pessoa escreveu, ou o que foi lido de um arquivo
     * de texto no navegador.
     *
     * O teto existe pela mesma razão do teto de artigos na sugestão de seção:
     * sem ele, um documento de duzentas páginas entra inteiro num prompt só e
     * volta truncado sem ninguém saber que truncou.
     */
    source: z.string().max(60_000).default(""),
    /** O documento que o modelo precisa **ver**: PDF ou imagem. */
    file: attachmentSchema.optional(),
  })
  .strict()
  /*
    Pedido sem texto e sem arquivo não tem do que extrair. Recusar aqui evita
    uma ida ao provedor que só pode voltar vazia — e uma resposta vazia sem
    causa aparente é pior que um erro que diz o que faltou.
  */
  .refine((request) => request.source.trim() !== "" || request.file !== undefined, {
    message: "É preciso texto ou arquivo.",
  });

export type FieldFillRequest = z.infer<typeof fieldFillRequestSchema>;

/** Uma frase curta dizendo de onde saiu. É o que torna a proposta revisável. */
interface Justificado {
  /** O `name` do campo pedido — nunca um que não perguntamos. */
  name: string;
  reason: string;
}

export interface FilledValue extends Justificado {
  kind: "valor";
  value: string;
}

export interface FilledList extends Justificado {
  kind: "lista";
  items: Record<string, string>[];
}

/**
 * União, e não um campo `value` que às vezes é lista.
 *
 * Quem consome precisa decidir o que fazer com cada forma — uma vai para um
 * `input`, a outra vira várias linhas —, e um tipo que esconde a diferença
 * empurra essa decisão para um `typeof` no meio da tela.
 */
export type FilledField = FilledValue | FilledList;

export interface FieldFillResult {
  fields: FilledField[];
  /**
   * O que o modelo precisaria saber para preencher o resto.
   *
   * Metade do valor está aqui, e não nos campos. Um preenchimento que chuta o
   * que não sabe obriga a pessoa a conferir tudo — e conferir tudo custa mais
   * que digitar. Perguntar deixa a lacuna visível e mantém a decisão com quem
   * abriu o formulário.
   */
  questions: string[];
}

/**
 * Lê o que o modelo devolveu, e **descarta o que ele inventou**.
 *
 * Três defesas, todas com precedente neste produto:
 *
 * - o campo tem de ser um dos que perguntamos, senão a resposta desalinhada
 *   escreve no lugar errado;
 * - campo de escolha só aceita valor do catálogo, com a mesma conferência que
 *   a sugestão de seção faz no identificador — instrução no prompt não é
 *   garantia;
 * - um valor por campo, porque dois seriam duas respostas para a mesma
 *   pergunta e a tela teria de escolher sozinha.
 *
 * Campo descartado não vira vazio com cara de resposta: ele simplesmente não
 * aparece, e o formulário continua mostrando o que já tinha.
 */
export function parseFieldFill(raw: unknown, request: FieldFillRequest): FieldFillResult {
  const porNome = new Map(request.fields.map((field) => [field.name, field]));

  const bruto = typeof raw === "string" ? safeJson(raw) : raw;
  const objeto = isRecord(bruto) ? bruto : {};

  const vistos = new Set<string>();
  const fields: FilledField[] = [];

  for (const item of asList(objeto.fields)) {
    if (!isRecord(item)) continue;

    const name = text(item.name);
    const spec = porNome.get(name);

    if (!spec || vistos.has(name)) continue;

    if (spec.kind === "lista") {
      const items = readItems(item.items, spec.itemFields ?? []);

      // Lista vazia não é proposta: seria uma linha na tela dizendo "nada".
      if (items.length === 0) continue;

      vistos.add(name);
      fields.push({ kind: "lista", name, items, reason: reason(item) });
      continue;
    }

    const value = text(item.value);
    if (value === "") continue;

    /*
      A comparação da escolha ignora caixa e acento porque o modelo devolve
      "eberick" para "Eberick" — recusar por causa disso jogaria fora uma
      resposta certa. O que entra é sempre o valor do catálogo, e nunca o que
      veio na resposta, senão a grafia do modelo vaza para dentro do registro.
      */
    if (spec.kind === "escolha") {
      const escolhido = (spec.options ?? []).find(
        (option) => fold(option) === fold(value)
      );

      if (!escolhido) continue;

      vistos.add(name);
      fields.push({ kind: "valor", name, value: escolhido, reason: reason(item) });
      continue;
    }

    vistos.add(name);
    fields.push({ kind: "valor", name, value, reason: reason(item) });
  }

  const questions = asList(objeto.questions)
    .map((item) => text(item))
    .filter((pergunta) => pergunta !== "")
    .slice(0, 5)
    .map((pergunta) => pergunta.slice(0, 240));

  return { fields, questions };
}

/**
 * Lê os itens de um campo de lista, mantendo só as colunas que perguntamos.
 *
 * Item sem nenhum valor é descartado: uma linha em branco no formulário é pior
 * que uma linha a menos, porque parece conteúdo que se perdeu.
 *
 * O teto existe pela mesma razão dos outros tetos deste arquivo — um documento
 * de duzentas páginas viraria duzentas mensagens no formulário, e ninguém
 * revisa duzentas.
 */
function readItems(raw: unknown, itemFields: ItemField[]): Record<string, string>[] {
  const nomes = itemFields.map((field) => field.name);
  const resultado: Record<string, string>[] = [];

  for (const bruto of asList(raw)) {
    if (!isRecord(bruto)) continue;

    const item: Record<string, string> = {};

    for (const nome of nomes) {
      const valor = text(bruto[nome]);
      if (valor !== "") item[nome] = valor;
    }

    if (Object.keys(item).length > 0) resultado.push(item);
    if (resultado.length === MAX_LIST_ITEMS) break;
  }

  return resultado;
}

function reason(item: Record<string, unknown>): string {
  return text(item.reason).slice(0, 240);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Sem caixa e sem acento, para comparar escolha sem recusar grafia. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function safeJson(raw: string): unknown {
  /*
    O modelo às vezes devolve o JSON cercado de crase, apesar de pedirmos que
    não. Recusar por causa da cerca desperdiçaria uma resposta correta — é a
    mesma tolerância que a sugestão de seção já tem.
  */
  const limpo = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(limpo);
  } catch {
    return null;
  }
}
