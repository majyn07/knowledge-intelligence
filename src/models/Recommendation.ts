export interface Recommendation {
  id: string;

  solution: string;

  type: "create" | "update" | "review" | "merge";

  article: string;

  section?: string;

  suggestedContent: string;

  justification: string;
}