import type { Recommendation } from "./Recommendation";

export interface AnalysisResult {
  classification: "strong" | "partial" | "none";

  confidence: number;

  relatedArticles: number;

  recommendations: Recommendation[];
}