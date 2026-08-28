export interface TicketMessageFormData {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface TicketFormData {
  title: string;
  company: string;
  solution: string;
  date: string;
  projectId: string;
  /**
   * O número do atendimento na HubSpot.
   *
   * É o vínculo com a origem, e sem ele a conversa que a API traz não tem a
   * qual atendimento se ligar. Vazio é legítimo: atendimento que não veio de
   * lá não tem número, e inventar um seria pior que não ter.
   */
  externalId: string;
  /** O registro da conversa é parte do atendimento: é a evidência que a análise lê. */
  messages: TicketMessageFormData[];
}
