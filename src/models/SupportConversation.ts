/**
 * Quem falou, como categoria e não como rótulo.
 *
 * O rótulo é apresentação e muda: "Cliente" hoje, o nome da pessoa amanhã se a
 * equipe decidir trazer identificação. O papel é contrato, e é o que a tela usa
 * para desenhar de que lado a mensagem fica e quem é automação.
 */
export type SupportMessageRole = "cliente" | "suporte" | "automacao" | "sistema";

export interface SupportConversationMessage {
  id: string;
  author: string;
  role: SupportMessageRole;
  body: string;
  createdAt: string;
  /**
   * O canal, quando se sabe.
   *
   * Vazio para conversa cadastrada à mão, que é a maioria do que existe hoje.
   * A tela só mostra quando tem: inventar "e-mail" para o que veio digitado
   * seria afirmar origem que ninguém declarou.
   */
  channel?: string;
}

/** Normalized conversation contract for future support providers. */
export interface SupportConversation {
  id: string;
  ticketId: string;
  messages: SupportConversationMessage[];
  source?: {
    provider: "hubspot";
    externalId: string;
    importedAt: string;
  };
}
