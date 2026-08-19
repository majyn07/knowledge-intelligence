/**
 * Minimal shapes expected from HubSpot. These are contracts only: no SDK, token,
 * endpoint, or network behavior is included while the integration is unauthorized.
 */
export interface HubSpotTicketRecord {
  id: string;
  properties: {
    subject?: string;
    content?: string;
    createdate?: string;
    hs_pipeline?: string;
  };
}

export interface HubSpotConversationRecord {
  id: string;
  ticketId?: string;
  messages: Array<{
    id: string;
    text?: string;
    createdAt?: string;
    sender?: string;
  }>;
}

export interface SupportImportScope {
  projectId: string;
}
