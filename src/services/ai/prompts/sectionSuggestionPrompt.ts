import type { AIChatMessage } from "@/models/AIChatMessage";

import type { SectionSuggestionRequest } from "../classify/sectionSuggestion";

/**
 * O prompt da sugestão de seção.
 *
 * O vocabulário vai **inteiro no pedido**, e a resposta tem de escolher dentro
 * dele. Deixar o modelo nomear a seção livremente produziria "Elétrica
 * Predial", que não existe no cadastro e não classifica nada, e a conferência
 * do identificador na volta é o que garante isso, porque instrução não é
 * garantia.
 *
 * Pedir para **admitir a dúvida** é deliberado: um modelo que sempre responde
 * classifica tudo, inclusive o que não dá para classificar, e a revisão humana
 * perde a única pista de onde olhar com atenção.
 */
const SYSTEM = [
  "Você classifica artigos de suporte técnico da AltoQi na estrutura do portal publicado.",
  "",
  "A AltoQi desenvolve software para engenharia e construção: cálculo estrutural,",
  "instalações prediais, orçamento e gestão de obras.",
  "",
  "Regras:",
  "- Escolha a seção **apenas** entre os identificadores fornecidos. Não invente.",
  "- Um artigo por sugestão, e no máximo uma sugestão por artigo.",
  "- Se o artigo não couber com clareza em nenhuma seção, não sugira nada para ele.",
  "  Ficar de fora é uma resposta legítima e melhor que um palpite.",
  "- A confiança é sua leitura honesta: 'alta' quando o assunto é inequívoco,",
  "  'media' quando há mais de uma seção plausível, 'baixa' quando é chute educado.",
  "- A justificativa tem no máximo uma frase curta, em português.",
].join("\n");

export function buildSectionSuggestionPrompt(request: SectionSuggestionRequest): AIChatMessage[] {
  const secoes = request.sections
    .map((section) => `${section.id} = ${section.path}`)
    .join("\n");

  const artigos = request.articles
    .map((article) =>
      [
        `## ${article.id}`,
        `Título: ${article.title}`,
        article.summary ? `Resumo: ${article.summary}` : "",
        article.excerpt ? `Trecho: ${article.excerpt}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");

  const prompt = [
    "# SEÇÕES DISPONÍVEIS",
    "",
    secoes,
    "",
    "# ARTIGOS A CLASSIFICAR",
    "",
    artigos,
    "",
    "# TAREFA",
    "",
    "Para cada artigo, escolha a seção mais adequada entre as disponíveis.",
    "Responda exclusivamente com JSON válido, sem markdown e sem texto em volta:",
    "",
    '{ "suggestions": [ { "articleId": "...", "sectionId": "...", "confidence": "alta|media|baixa", "reason": "..." } ] }',
    "",
    "Omita o artigo que não couber com clareza em nenhuma seção.",
  ].join("\n");

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: prompt },
  ];
}
