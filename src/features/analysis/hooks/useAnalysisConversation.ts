import type { AIContext } from "@/models/AIContext";
import type { AnalysisMessage } from "@/models/AnalysisMessage";

import { analysisService } from "../services/analysisService";

export async function sendAnalysisMessage(
  context: AIContext,
  messages: AnalysisMessage[]
): Promise<AnalysisMessage> {
  return analysisService.sendMessage(
    context,
    messages
  );
}
