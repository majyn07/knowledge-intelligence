import type { AnalysisMessage } from "@/models/AnalysisMessage";

export interface AnalysisConversationState {
  messages: AnalysisMessage[];
  isLoading: boolean;
}