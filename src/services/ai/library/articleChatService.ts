import "server-only";

import { buildArticleChatPrompt } from "../prompts/articleChatPrompt";
import { activeProvider } from "../server/providerRegistry";
import type { ArticleChatRequest } from "./articleChat";

/**
 * A consulta sobre um artigo.
 *
 * O provedor é resolvido a cada chamada, como no resto da fronteira: quem
 * decide na carga do módulo continua falando com o provedor antigo depois de
 * alguém trocar a configuração.
 *
 * A resposta é **texto**, e não estrutura: aqui ninguém aplica nada
 * automaticamente. O que a IA disser é lido por uma pessoa, que decide se
 * vira edição.
 */
export const articleChatService = {
  ask(request: ArticleChatRequest): Promise<string> {
    return activeProvider().complete(buildArticleChatPrompt(request));
  },
};
