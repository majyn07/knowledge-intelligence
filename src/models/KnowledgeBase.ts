export interface KnowledgeBase {
  id: string;
  projectId: string;
  solution: string;
  source: string;
  version: string;
  importedAt: string;
  articles: number;
  status: "Atualizada" | "Desatualizada";
}