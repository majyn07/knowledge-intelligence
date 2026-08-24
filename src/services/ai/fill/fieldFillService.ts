import "server-only";

import { buildFieldFillPrompt } from "../prompts/fieldFillPrompt";
import { activeProvider } from "../server/providerRegistry";
import { parseFieldFill, type FieldFillRequest, type FieldFillResult } from "./fieldFill";

/**
 * Propõe o preenchimento de um formulário a partir de texto livre.
 *
 * O provedor é resolvido a cada chamada, como no resto da fronteira, e a
 * resposta passa pela conferência de campo e catálogo antes de subir: o que o
 * modelo inventou não vira preenchimento, vira ausência.
 */
export const fieldFillService = {
  async execute(request: FieldFillRequest): Promise<FieldFillResult> {
    const raw = await activeProvider().complete(buildFieldFillPrompt(request), {
      json: true,
      /*
        O anexo vai e não fica. Ele existe durante este pedido, e nada aqui o
        escreve em disco, banco ou registro — o produto guarda o que foi
        extraído e revisado, não o documento.
      */
      ...(request.file ? { files: [request.file] } : {}),
    });

    return parseFieldFill(raw, request);
  },
};
