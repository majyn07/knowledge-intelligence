export type DocumentationStatus =
  | "adequate"
  | "partial"
  | "missing"
  | "outdated";

export type ConfidenceLevel =
  | "high"
  | "medium"
  | "low";

export interface KnowledgeClassification {
  documentationStatus: DocumentationStatus;
  confidenceLevel: ConfidenceLevel;
}

export const DocumentationStatusLabel: Record<
  DocumentationStatus,
  string
> = {
  adequate: "Cobertura adequada",
  partial: "Cobertura parcial",
  missing: "Sem cobertura",
  outdated: "Conteúdo desatualizado",
};

export const ConfidenceLevelLabel: Record<
  ConfidenceLevel,
  string
> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};