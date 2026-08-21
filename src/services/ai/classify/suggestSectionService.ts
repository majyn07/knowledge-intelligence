import "server-only";

import { buildSectionSuggestionPrompt } from "../prompts/sectionSuggestionPrompt";
import { activeProvider } from "../server/providerRegistry";
import {
  parseSectionSuggestions,
  type SectionSuggestion,
  type SectionSuggestionRequest,
} from "./sectionSuggestion";

/**
 * Propõe seção para artigos que entraram sem classificação.
 *
 * O provedor é resolvido a cada chamada, como no resto da fronteira, e o
 * resultado passa pela conferência de identificador antes de subir: o que o
 * modelo inventou não vira sugestão, vira ausência.
 */
export const suggestSectionService = {
  async execute(request: SectionSuggestionRequest): Promise<SectionSuggestion[]> {
    const raw = await activeProvider().complete(buildSectionSuggestionPrompt(request), {
      json: true,
    });

    return parseSectionSuggestions(raw, request);
  },
};
