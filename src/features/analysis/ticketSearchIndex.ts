import { deacentuar, searchTerms } from "@/lib/vocabulary";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import { camposDoTicket } from "./ticketTableView";

/**
 * O texto das conversas, pronto para a busca.
 *
 * A busca varria assunto, cliente, empresa e solução — tudo que está **fora**
 * da conversa. Só que o problema do cliente está dentro dela: quem procura
 * "modelo IFC deslocado" está procurando uma frase que alguém digitou na
 * terceira mensagem, e não o assunto que o robô de triagem gerou. Metade dos
 * assuntos começa com "Ticket AltoQi nº".
 *
 * É o mesmo movimento que a Biblioteca fez quando o portal entrou: a busca
 * passou a olhar o corpo do artigo, porque o que se procura quase nunca está no
 * título.
 *
 * **Indexado uma vez por coleção, e não a cada tecla.** São 974 conversas e
 * 16.488 mensagens: refazer a limpeza a cada letra digitada seria varrer quatro
 * megabytes por toque. Guardado num `WeakMap` na própria lista, como a medição
 * de termos onipresentes do acervo: quando as conversas mudam, a chave muda
 * junto e o índice se refaz sozinho.
 */

const indices = new WeakMap<readonly SupportConversation[], Map<string, string>>();

/**
 * O texto de cada conversa, por atendimento.
 *
 * Sem acento e sem caixa, porque é assim que a busca compara. A junção usa
 * espaço e não quebra de linha: o que importa aqui é conter a palavra, e
 * guardar a estrutura custaria memória por nada.
 */
export function indexarConversas(
  conversas: readonly SupportConversation[]
): Map<string, string> {
  const guardado = indices.get(conversas);

  if (guardado) return guardado;

  const indice = new Map<string, string>();

  for (const conversa of conversas) {
    const texto = conversa.messages.map((mensagem) => mensagem.body).join(" ");

    indice.set(conversa.ticketId, deacentuar(texto));
  }

  indices.set(conversas, indice);

  return indice;
}

const termos = new WeakMap<readonly Ticket[], Map<string, string[]>>();

/**
 * As palavras de cada atendimento, prontas para a busca.
 *
 * Mesmo movimento do índice de conversas, e pelo mesmo motivo medido: a busca
 * refazia `searchTerms` sobre os campos dos 1.025 atendimentos **a cada tecla**,
 * e duas vezes, porque a contagem por etapa repetia a conta. O campo `solution`
 * é o e-mail inteiro do suporte, alguns kB por atendimento: tirar acento e
 * quebrar em palavras aquilo tudo dava **4,4 s por letra digitada**, medido na
 * compilação de produção. Indexado uma vez por coleção, some.
 */
export function indexarAtendimentos(tickets: readonly Ticket[]): Map<string, string[]> {
  const guardado = termos.get(tickets);

  if (guardado) return guardado;

  const indice = new Map<string, string[]>();

  for (const ticket of tickets) {
    indice.set(ticket.id, searchTerms(camposDoTicket(ticket).join(" ")));
  }

  termos.set(tickets, indice);

  return indice;
}
