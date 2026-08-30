import type { AIChatMessage } from "@/models/AIChatMessage";

import type { MergeRequest } from "../library/mergeAdvice";

/**
 * O prompt de "estes dois deveriam ser um só?".
 *
 * **"Complementares" é o veredito que precisa existir**, e ele é o mais comum:
 * dois artigos tratando do mesmo assunto por ângulos diferentes, onde unir
 * perderia conteúdo e deixar como está deixa quem procura achando só um dos
 * dois. Com duas opções o modelo é empurrado para "unir" toda vez que os textos
 * se parecem, que é exatamente o erro caro — um artigo apagado não volta.
 *
 * **Vocabulário em comum não é o critério, e vai dito.** A tela já mostra a
 * porcentagem; se o modelo repetir esse raciocínio ele não acrescenta nada ao
 * que a contagem de palavras já fez. O critério é se a pessoa que procura
 * resolveria o caso lendo um só.
 *
 * **O identificador não entra na prosa**, mesma regra da avaliação de cobertura
 * e da trilha de navegação: `uuid` no meio da frase é pior que frase curta.
 */
const SYSTEM = [
  "Você compara dois artigos da base de conhecimento do suporte da AltoQi e diz se",
  "eles deveriam ser um só.",
  "",
  "A AltoQi desenvolve software para engenharia e construção: cálculo estrutural,",
  "instalações prediais, orçamento e gestão de obras.",
  "",
  "Escolha uma relação:",
  "- 'mesmo-assunto': respondem à mesma dúvida. Quem lê um não precisa do outro.",
  "- 'complementares': tratam do mesmo tema por ângulos diferentes, e cada um tem",
  "  conteúdo que o outro não tem. Unir perderia parte; deixar separado faz quem",
  "  procura achar só um dos dois.",
  "- 'assuntos-diferentes': parecem próximos e respondem dúvidas distintas.",
  "",
  "Regras:",
  "- Palavras em comum **não** são o critério. Dois textos podem citar 'licença' e",
  "  responder dúvidas diferentes. O que conta é se quem procura resolveria o caso",
  "  lendo um só.",
  "- Em 'mesmo-assunto' e 'complementares', diga qual dos dois deve ser o mantido:",
  "  o mais completo, o mais atual, o mais bem estruturado. Use o identificador",
  "  fornecido no campo próprio.",
  "- 'levarJunto' é o que o outro tem e o mantido **não** tem. É a lista do que se",
  "  perderia unindo sem cuidado, e é a parte mais útil da sua resposta.",
  "- Em 'assuntos-diferentes', 'manter' é nulo e 'levarJunto' fica vazio.",
  "- No texto que a pessoa lê, refira-se aos artigos pelo **título**, nunca pelo",
  "  identificador.",
  "- Você não une nada. Quem une, arquiva ou deixa como está é quem revisa.",
  "- Português do Brasil, direto, sem preâmbulo.",
].join("\n");

export function buildMergePrompt(request: MergeRequest): AIChatMessage[] {
  const artigo = (item: MergeRequest["a"], lado: string) =>
    [
      `## ${lado} — ${item.id}`,
      `Título: ${item.title}`,
      item.summary ? `Resumo: ${item.summary}` : "",
      /*
        O corte é dito ao modelo, e não só à tela: veredito baseado em meio
        artigo apresentado como se fosse sobre o inteiro é erro que ninguém vê.
      */
      item.truncated ? "(o texto abaixo está cortado no fim; considere isso)" : "",
      "",
      item.text,
    ]
      .filter(Boolean)
      .join("\n");

  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [artigo(request.a, "PRIMEIRO"), artigo(request.b, "SEGUNDO")].join("\n\n---\n\n"),
    },
  ];
}
