import type { AIChatMessage } from "@/models/AIChatMessage";

import type { AssistantRequest } from "../assistant/assistant";

/**
 * O prompt do assistente de tela.
 *
 * **Ele recebe um retrato, não o acervo.** A regra mais importante aqui é a que
 * o impede de fingir que leu tudo: perguntado "resuma todos os artigos de laje",
 * ele tem de dizer que não os tem, e não produzir um resumo plausível de textos
 * que nunca viu. É a mesma disciplina do painel do artigo, onde a separação
 * entre "pergunta sobre o artigo" e "pergunta respondida pelo artigo" precisou
 * ser escrita para o modelo parar de completar com conhecimento de treinamento.
 *
 * **E os números do retrato são os da tela.** Recontar é a pior falha possível
 * aqui: a pessoa lê "1.822 artigos" no painel e "cerca de 1.800" na resposta, e
 * passa a desconfiar dos dois. Os valores se citam como vieram.
 */
const SYSTEM = [
  "Você é o assistente do Visus Knowledge Intelligence, o hub interno da AltoQi que",
  "transforma atendimentos de suporte em conhecimento publicado.",
  "",
  "A AltoQi desenvolve software para engenharia e construção: cálculo estrutural,",
  "instalações prediais, orçamento e gestão de obras. A base de conhecimento é o",
  "portal suporte.altoqi.com.br, espelhado aqui.",
  "",
  "Você recebe um RETRATO da tela em que a pessoa está: contagens que o produto",
  "calculou, achados já apurados e uma amostra pequena. **Você não recebe o acervo.**",
  "",
  "Regras:",
  "- Responda a partir do retrato. Se a resposta exigir ler artigos ou atendimentos",
  "  que não estão aí, diga isso e aponte onde a pessoa encontra — não invente.",
  "- Cite os números **como vieram**. Não arredonde, não recalcule, não estime.",
  "  A pessoa está vendo os mesmos números na tela, e divergir destrói a confiança",
  "  nos dois.",
  "- Os achados foram calculados dos dados, não por um modelo. Trate-os como fato,",
  "  e ajude a priorizar: o que resolve mais, o que dá para fazer junto, por onde começar.",
  "- Quando a pergunta for sobre conteúdo repetido ou artigos que poderiam virar um",
  "  só, use os achados de sobreposição e de título repetido. Se não houver achado",
  "  desse tipo no retrato, diga que a apuração não encontrou nenhum.",
  "- Não proponha ação irreversível como se já estivesse feita. Quem publica,",
  "  exclui e funde é a pessoa.",
  "- Português do Brasil, direto, sem preâmbulo. Markdown simples quando ajudar a ler:",
  "  listas curtas e negrito no essencial. Respostas curtas — isto é um painel lateral,",
  "  não um relatório.",
].join("\n");

function bloco(titulo: string, corpo: string): string {
  return corpo.trim() === "" ? "" : `# ${titulo}\n\n${corpo}`;
}

export function buildAssistantPrompt(request: AssistantRequest): AIChatMessage[] {
  const { context } = request;

  const fatos = context.fatos.map((fato) => `- ${fato.rotulo}: ${fato.valor}`).join("\n");

  const achados = context.achados
    .map((achado) => `- ${achado.titulo}\n  ${achado.porque}`)
    .join("\n");

  const retrato = [
    bloco("ONDE A PESSOA ESTÁ", `${context.tela}\n\n${context.alcance}`),
    bloco("NÚMEROS MEDIDOS", fatos),
    /*
      Os achados vêm rotulados como apurados. Sem isso o modelo pode tratá-los
      como opinião de outra IA e hesitar, ou pior, "melhorá-los" com um palpite.
    */
    bloco("ACHADOS JÁ APURADOS DOS DADOS", achados),
    /*
      A amostra é dita como amostra. Sem o rótulo, doze títulos parecem o acervo
      inteiro, e a resposta sai afirmando coisas sobre 1.822 a partir de doze.
    */
    bloco(
      "AMOSTRA (apenas exemplos, não é a lista completa)",
      context.amostra.map((item) => `- ${item}`).join("\n")
    ),
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: retrato },
    ...request.messages.map((mensagem) => ({
      role: mensagem.role === "user" ? ("user" as const) : ("assistant" as const),
      content: mensagem.content,
    })),
  ];
}
