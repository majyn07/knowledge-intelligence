import "server-only";

import { buildAssistantPrompt } from "../prompts/assistantPrompt";
import { activeProvider } from "../server/providerRegistry";
import type { AssistantRequest } from "./assistant";

/**
 * A conversa com o assistente de tela.
 *
 * A resposta é **texto**, e não estrutura, pelo mesmo motivo da consulta sobre
 * o artigo: aqui ninguém aplica nada automaticamente. O que a IA disser é lido
 * por uma pessoa, que decide se vira trabalho.
 *
 * O provedor é resolvido a cada chamada, como no resto da fronteira: quem
 * decide na carga do módulo continua falando com o provedor antigo depois de
 * alguém trocar a configuração.
 */
export const assistantService = {
  ask(request: AssistantRequest): Promise<string> {
    return activeProvider().complete(buildAssistantPrompt(request));
  },
};
