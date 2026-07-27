import type { KnowledgeClassification } from "./KnowledgeClassification";
import type { KnowledgeIdentification } from "./KnowledgeIdentification";
import type { KnowledgeOpportunity } from "./KnowledgeOpportunity";
import type { KnowledgeSummary } from "./KnowledgeSummary";

export interface KnowledgeAnalysisResult {
  identification: KnowledgeIdentification;
  summary: KnowledgeSummary;
  classification: KnowledgeClassification;
  confidence: number;
  relatedArticles: number;
  opportunities: KnowledgeOpportunity[];
}