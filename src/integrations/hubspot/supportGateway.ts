import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import type { SupportImportScope } from "./contracts";

/**
 * Boundary for a future HubSpot adapter. Implementations are deliberately async
 * because remote import will be asynchronous; no production feature uses it yet.
 */
export interface SupportGateway {
  listTickets(scope: SupportImportScope): Promise<Ticket[]>;
  getConversation(ticketId: string): Promise<SupportConversation | undefined>;
}

export class HubSpotAuthorizationRequiredError extends Error {
  constructor() {
    super("A integração HubSpot ainda não foi autorizada.");
    this.name = "HubSpotAuthorizationRequiredError";
  }
}

export const hubSpotIntegrationStatus = {
  provider: "hubspot",
  state: "not_authorized",
  networkEnabled: false,
} as const;

/** Safe placeholder: it never reads credentials and never performs a request. */
export const hubSpotSupportGateway: SupportGateway = {
  async listTickets() {
    throw new HubSpotAuthorizationRequiredError();
  },
  async getConversation() {
    throw new HubSpotAuthorizationRequiredError();
  },
};
