import type { AIChatRequest } from "@/models/AIChatRequest";

import { activeProvider } from "../server/providerRegistry";

/**
 * Fronteira de IA da análise.
 *
 * Quem é o provedor é resolvido a cada chamada, e não uma vez na importação:
 * a tela de Integrações relata estado do ambiente, e um módulo que decide na
 * carga continuaria falando com o provedor antigo depois de alguém trocar a
 * configuração e reimplantar.
 */
export const analysisAIService = {
  chat(request: AIChatRequest): Promise<string> {
    return activeProvider().chat(request);
  },

  analyze(request: AIChatRequest): Promise<string> {
    return activeProvider().analyze(request);
  },
};
