export interface AnalysisMessage {
  id: string;

  author: "assistant" | "user";

  message: string;

  createdAt: string;

  status?: "sending" | "completed" | "error";
}