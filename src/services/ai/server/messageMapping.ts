import type { AIChatMessage } from "@/models/AIChatMessage";

/**
 * Como as mensagens viram o pedido de um provedor.
 *
 * Puro e sem SDK: a divisão entre instrução de sistema e conversa é a mesma em
 * todos os provedores atuais, e foi onde um defeito silencioso morou.
 */

/**
 * **Todas** as instruções de sistema, e não só a primeira.
 *
 * Era `find`, que pegava uma e descartava as demais sem erro e sem aviso, com
 * o modelo respondendo sobre o que não recebeu. Custou uma consulta em que o
 * artigo inteiro ia no segundo bloco e a resposta foi "como o artigo não foi
 * fornecido": o pedido parecia certo dos dois lados.
 *
 * O contrato nunca disse "uma instrução só", e quem monta prompt tem motivo
 * para separar regra de contexto: a regra é fixa e o contexto muda a cada
 * registro.
 */
export function systemInstructionOf(messages: AIChatMessage[]): string {
  return messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
}

/** A conversa, sem as instruções de sistema. */
export function conversationOf(messages: AIChatMessage[]): string {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => message.content)
    .join("\n\n");
}
