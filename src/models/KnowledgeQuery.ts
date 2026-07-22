export interface KnowledgeQuery {
  text: string;

  projectId?: string;

  company?: string;

  module?: string;

  category?: string;

  tags?: string[];

  limit?: number;
}