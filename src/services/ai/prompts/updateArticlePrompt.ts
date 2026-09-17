import type { AIChatMessage } from "@/models/AIChatMessage";

import type { UpdateArticleRequest } from "../library/updateArticle";

/**
 * O prompt de "atualize este artigo com isto".
 *
 * **A regra central é não mexer no que o material não pede.** Um modelo com um
 * artigo inteiro na mão tende a reescrevê-lo — trocar palavras, reordenar,
 * "melhorar". Para quem revisa isso é o pior resultado: o artigo publicado tinha
 * sido conferido, e cada frase tocada sem motivo é uma frase que precisa ser
 * conferida de novo. A lista de mudanças existe para expor exatamente isso.
 *
 * **O formato é o do artigo, e vai dito.** O acervo do portal é HTML e o modelo
 * escreve Markdown por padrão. Sem a instrução, o artigo voltaria noutro formato
 * e a gravação trocaria o `contentFormat` — que é o defeito que aquele campo
 * existe para impedir.
 */
const SYSTEM = [
  "Você atualiza um artigo existente da base de conhecimento do suporte da AltoQi com",
  "material novo — tipicamente o conteúdo de uma versão nova do software.",
  "",
  "A AltoQi desenvolve software para engenharia e construção: cálculo estrutural,",
  "instalações prediais, orçamento e gestão de obras.",
  "",
  "Regras:",
  "- Devolva o artigo INTEIRO, já atualizado. Não devolva só o trecho novo.",
  "- Mexa apenas no que o material pede. O que o material não menciona fica",
  "  exatamente como está: mesmas palavras, mesma ordem, mesma pontuação. O artigo",
  "  publicado já foi conferido, e cada frase tocada sem motivo precisa ser",
  "  conferida de novo.",
  "- Insira o conteúdo novo no lugar certo da estrutura existente, seguindo o tom e",
  "  a forma do artigo. Se o material contradiz algo que já está escrito, substitua",
  "  o trecho antigo e diga isso na lista de mudanças.",
  "- Devolva o conteúdo NO MESMO FORMATO do artigo original. Se o original é HTML,",
  "  devolva HTML com as mesmas tags; se é Markdown, devolva Markdown.",
  "- Título e resumo só mudam se o material exigir. Na dúvida, mantenha.",
  "- Nunca invente passo, caminho de menu, número de versão ou mensagem de erro que",
  "  não esteja no material ou no artigo. O que faltar, deixe indicado para quem",
  "  revisa completar.",
  "- Em 'mudancas', liste cada acréscimo ou alteração em uma frase, dizendo onde.",
  "  É o que quem revisa lê primeiro.",
  "- Português do Brasil, direto, sem preâmbulo.",
].join("\n");

export function buildUpdateArticlePrompt(request: UpdateArticleRequest): AIChatMessage[] {
  const { article, material } = request;

  const artigo = [
    `Título: ${article.title}`,
    article.summary ? `Resumo: ${article.summary}` : "",
    `Formato: ${article.contentFormat === "html" ? "HTML" : "Markdown"}`,
    /* O corte é dito ao modelo: atualizar meio artigo como se fosse inteiro perde o fim. */
    article.truncated
      ? "(o artigo está cortado no fim por ser longo; preserve o que está aqui e não invente o resto)"
      : "",
    "",
    article.content,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `# ARTIGO EXISTENTE\n\n${artigo}\n\n---\n\n# MATERIAL NOVO A INCORPORAR\n\n${material}`,
    },
  ];
}
