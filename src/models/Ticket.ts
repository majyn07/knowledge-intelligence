export interface Ticket {
  id: string;
  projectId: string;
  title: string;
  solution: string;
  company: string;
  date: string;
  source?: SupportRecordSource;
}

/** External-system provenance, populated only when a future importer provides it. */
export interface SupportRecordSource {
  provider: "hubspot";
  externalId: string;
  importedAt: string;
}
