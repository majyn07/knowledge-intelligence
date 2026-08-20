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
  /** O registro da conversa é parte do atendimento: é a evidência que a análise lê. */
  messages: TicketMessageFormData[];
}
