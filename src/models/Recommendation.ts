export type RecommendationType =
  | "new_article"
  | "update_article"
  | "faq"
  | "tip"
  | "warning";

export interface Recommendation {
  id: string;

  type: RecommendationType;

  title: string;

  description: string;

  justification: string;
}