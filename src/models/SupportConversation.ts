export interface SupportConversationMessage {
  id: string;
  author: string;
  body: string;
  createdAt: string;
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
