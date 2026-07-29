import type {
  ConfidenceLevel,
  DocumentationStatus,
} from "@/features/analysis/types/KnowledgeClassification";
import type { KnowledgeAnalysisResult } from "@/features/analysis/types/KnowledgeAnalysisResult";
import type {
  OpportunityStatus,
  OpportunityType,
} from "@/features/analysis/types/KnowledgeOpportunity";

const VALID_TYPES: OpportunityType[] = [
  "new_article",
  "update_article",
  "faq",
  "tip",
  "warning",
];

const VALID_DOCUMENTATION_STATUS: DocumentationStatus[] = [
  "adequate",
  "partial",
  "missing",
  "outdated",
];

const VALID_CONFIDENCE_LEVEL: ConfidenceLevel[] = [
  "high",
  "medium",
  "low",
];

const DEFAULT_OPPORTUNITY_STATUS: OpportunityStatus =
  "proposed";

export function parseAnalysisResponse(
  response: string
): KnowledgeAnalysisResult {
  try {
    const sanitized = response
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    const result = JSON.parse(
      sanitized
    ) as KnowledgeAnalysisResult;

    result.classification ??= {
      documentationStatus: "missing",
      confidenceLevel: "low",
    };

    result.classification.documentationStatus =
      VALID_DOCUMENTATION_STATUS.includes(
        result.classification.documentationStatus
      )
        ? result.classification.documentationStatus
        : "missing";

    result.classification.confidenceLevel =
      VALID_CONFIDENCE_LEVEL.includes(
        result.classification.confidenceLevel
      )
        ? result.classification.confidenceLevel
        : "low";

    result.opportunities =
      result.opportunities?.map((opportunity) => ({
        ...opportunity,
        id: opportunity.id ?? crypto.randomUUID(),
        status:
          opportunity.status ??
          DEFAULT_OPPORTUNITY_STATUS,
        type: VALID_TYPES.includes(opportunity.type)
          ? opportunity.type
          : "tip",
      })) ?? [];

    result.confidence ??= 0;
    result.relatedArticles ??= 0;

    return result;
  } catch (error) {
    console.error(error);

    throw new Error(
      "Não foi possível interpretar a resposta da IA."
    );
  }
}
