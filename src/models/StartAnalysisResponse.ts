import type { AIContext } from "./AIContext";
import type { AnalysisMessage } from "./AnalysisMessage";
import type { AnalysisResult } from "./AnalysisResult";

export interface StartAnalysisResponse {
  analysisResult: AnalysisResult;

  messages: AnalysisMessage[];

  context: AIContext;
}