import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import type { HubSpotConversationRecord, HubSpotTicketRecord } from "./contracts";

/** Pure normalization functions, intentionally not invoked until import is authorized. */
export function mapHubSpotTicket(record: HubSpotTicketRecord, projectId: string, importedAt: string): Ticket {
  return {
    id: `hubspot-ticket-${record.id}`,
    projectId,
    title: record.properties.subject?.trim() || "Ticket sem assunto",
    solution: record.properties.hs_pipeline ?? "",
    company: "",
    date: record.properties.createdate ?? importedAt,
    source: { provider: "hubspot", externalId: record.id, importedAt },
  };
}

export function mapHubSpotConversation(record: HubSpotConversationRecord, ticketId: string, importedAt: string): SupportConversation {
  return {
    id: `hubspot-conversation-${record.id}`,
    ticketId,
    messages: record.messages.map((message) => ({
      id: message.id,
      author: message.sender ?? "",
      body: message.text ?? "",
      createdAt: message.createdAt ?? importedAt,
    })),
    source: { provider: "hubspot", externalId: record.id, importedAt },
  };
}
