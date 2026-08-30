import type { SupportConversation } from "@/models/SupportConversation";

/**
 * O que o cliente escolheu no atendimento digital.
 *
 * A classificação do ticket vive em propriedade da HubSpot, atrás de um escopo
 * que a credencial não tem, e a exportação em CSV não está disponível. Mas o
 * bot **pergunta ao cliente** antes de abrir o chamado, e pergunta e resposta
 * são mensagens da conversa — que nós já temos.
 *
 * Não é dedução: é a opção que a pessoa clicou, copiada literal. Vale a mesma
 * regra do resto do produto — o que dá para derivar dos dados é derivado, e o
 * que exigiria adivinhar fica vazio.
 *
 * Medido nas 974 conversas do acervo: 410 trazem a área do contato, 314 o tipo
 * da solicitação, 433 alguma das duas.
 */

/**
 * As duas perguntas do bot, pelo texto que ele escreve.
 *
 * Casadas por trecho e sem acento porque a redação variou com o tempo, e é o
 * miolo da frase que se manteve.
 */
const PERGUNTAS = {
  areaDoContato: /melhor descreve o motivo do seu contato/i,
  tipoDaSolicitacao: /melhor representa o tipo da sua solicita/i,
} as const;

export type ChatbotAnswerField = keyof typeof PERGUNTAS;

export const CHATBOT_ANSWER_FIELDS = Object.keys(PERGUNTAS) as ChatbotAnswerField[];

/**
 * Opções que não respondem a pergunta.
 *
 * "Voltar ao menu anterior" aparece sete vezes no acervo e é navegação: contá-la
 * como resposta criaria uma linha no ranking que não descreve atendimento
 * nenhum. Quem escolheu voltar respondeu depois, então a busca continua.
 */
const NAVEGACAO = ["voltar ao menu anterior", "voltar", "menu anterior"];

/**
 * Acima disto é texto livre, não escolha.
 *
 * As opções do bot são curtas; o teto separa as duas coisas sem precisar
 * conhecer a lista, que muda quando o time de suporte a muda.
 */
const TETO_DA_OPCAO = 80;

/**
 * Frase, e não opção de menu.
 *
 * O teto sozinho não bastou, e o dado real mostrou: um cliente respondeu
 * "Bom dia, voltou o acesso. Está funcionando normalmente." — cinquenta e cinco
 * caracteres, dentro do limite, e apareceu no ranking como se fosse uma escolha
 * que 1 pessoa fez. Opção de menu não termina em ponto nem emenda duas frases;
 * nenhuma das dezesseis do acervo tem pontuação de fim.
 */
const FIM_DE_FRASE = /[.!?](\s|$)/;

export interface ChatbotAnswers {
  areaDoContato: string;
  tipoDaSolicitacao: string;
}

const vazio = (): ChatbotAnswers => ({ areaDoContato: "", tipoDaSolicitacao: "" });

export function respostasDoChatbot(
  conversa: SupportConversation | undefined
): ChatbotAnswers {
  const resposta = vazio();

  if (!conversa) return resposta;

  const mensagens = conversa.messages;

  for (const campo of CHATBOT_ANSWER_FIELDS) {
    for (let i = 0; i < mensagens.length; i += 1) {
      if (!PERGUNTAS[campo].test(mensagens[i]?.body ?? "")) continue;

      /*
        A resposta é a próxima mensagem, e não a próxima do cliente: o papel
        vem do ator da HubSpot, e a escolha num widget de bot nem sempre chega
        atribuída a quem clicou.
      */
      for (let j = i + 1; j < mensagens.length; j += 1) {
        const texto = (mensagens[j]?.body ?? "").trim();

        if (texto === "" || texto.length > TETO_DA_OPCAO) break;
        if (FIM_DE_FRASE.test(texto)) break;
        if (NAVEGACAO.includes(texto.toLocaleLowerCase("pt-BR"))) continue;

        resposta[campo] = texto;
        break;
      }

      if (resposta[campo] !== "") break;
    }
  }

  return resposta;
}

/**
 * As respostas por atendimento, uma passada por coleção.
 *
 * Mesmo motivo do índice da busca: são 974 conversas e 16.488 mensagens, e
 * refazer a varredura a cada render custaria caro por nada. Quando as conversas
 * mudam, a chave do `WeakMap` muda junto e o mapa se refaz sozinho.
 */
const mapas = new WeakMap<readonly SupportConversation[], Map<string, ChatbotAnswers>>();

export function indexarRespostas(
  conversas: readonly SupportConversation[]
): Map<string, ChatbotAnswers> {
  const guardado = mapas.get(conversas);

  if (guardado) return guardado;

  const mapa = new Map<string, ChatbotAnswers>();

  for (const conversa of conversas) {
    mapa.set(conversa.ticketId, respostasDoChatbot(conversa));
  }

  mapas.set(conversas, mapa);

  return mapa;
}
