export interface KnowledgeQuery {
  text: string;

  company?: string;

  module?: string;

  category?: string;

  tags?: string[];

  limit?: number;
}