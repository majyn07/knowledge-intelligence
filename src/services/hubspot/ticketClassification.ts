import { items, record, text } from "@/lib/shape";
import {
  TICKET_CLASSIFICATIONS,
  type TicketClassificationField,
} from "@/models/TicketClassification";

/**
 * A classificação que o suporte fez na HubSpot, virando a nossa.
 *
 * A HubSpot devolve o **valor interno** da opção, e não o texto que quem
 * atendeu escolheu: `cc__causa_do_contato` vem como `erro_de_modelagem`, e o
 * rótulo "Erro de modelagem" mora no vocabulário da propriedade. Gravar o valor
 * interno faria a contagem do produto exibir identificador onde a equipe
 * escreveu frase, e a lista de opções muda de nome no painel sem mudar o valor.
 *
 * Opção que não está mais no vocabulário (removida depois de usada) é mostrada
 * **como veio**, e não apagada: o atendimento foi classificado assim, e sumir
 * com isso seria reescrever o que o suporte registrou.
 */

export type Vocabulario = Map<string, Map<string, string>>;

export type ClassificacaoHubSpot = Record<TicketClassificationField, string>;

/** As propriedades que pedimos à HubSpot: só as da classificação. */
export const PROPRIEDADES_DA_CLASSIFICACAO = TICKET_CLASSIFICATIONS.map((item) => item.hubspot);

/** O vocabulário de cada propriedade, a partir de `GET /crm/v3/properties/tickets`. */
export function vocabularioDe(resposta: unknown): Vocabulario {
  const vocabulario: Vocabulario = new Map();

  for (const propriedade of items(record(resposta).results)) {
    const p = record(propriedade);
    const opcoes = new Map<string, string>();

    for (const opcao of items(p.options)) {
      const o = record(opcao);
      const valor = text(o.value);
      if (valor !== "") opcoes.set(valor, text(o.label) || valor);
    }

    vocabulario.set(text(p.name), opcoes);
  }

  return vocabulario;
}

/**
 * As propriedades de um ticket, em rótulos, nos nossos onze campos.
 *
 * Seleção múltipla vem separada por `;` e volta assim, já em rótulos. Campo
 * vazio fica vazio: a ausência de classificação é dado, e a tela a conta.
 */
export function classificacaoDe(
  propriedades: Record<string, unknown>,
  vocabulario: Vocabulario
): ClassificacaoHubSpot {
  return Object.fromEntries(
    TICKET_CLASSIFICATIONS.map((campo) => {
      const bruto = text(propriedades[campo.hubspot]).trim();
      const opcoes = vocabulario.get(campo.hubspot);

      const rotulo =
        bruto === ""
          ? ""
          : bruto
              .split(";")
              .map((valor) => valor.trim())
              .filter((valor) => valor !== "")
              .map((valor) => opcoes?.get(valor) ?? valor)
              .join("; ");

      return [campo.key, rotulo];
    })
  ) as ClassificacaoHubSpot;
}

/**
 * O que a leitura em lote devolveu, por número do chamado.
 *
 * Número pedido e não devolvido é **contado** à parte: chamado apagado ou
 * mesclado na HubSpot. Não vira classificação vazia, porque vazio diria "o
 * suporte não classificou" sobre algo que simplesmente não está mais lá.
 */
export function lerLoteDeClassificacao(
  resposta: unknown,
  vocabulario: Vocabulario
): Map<string, ClassificacaoHubSpot> {
  const porId = new Map<string, ClassificacaoHubSpot>();

  for (const linha of items(record(resposta).results)) {
    const r = record(linha);
    const id = text(r.id).trim();
    if (id !== "") porId.set(id, classificacaoDe(record(r.properties), vocabulario));
  }

  return porId;
}
