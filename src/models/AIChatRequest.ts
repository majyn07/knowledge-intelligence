import type { AnalysisMessage } from "./AnalysisMessage";
import type { AIContext } from "./AIContext";

export interface AIChatRequest {
  messages: AnalysisMessage[];
  context?: AIContext;
}