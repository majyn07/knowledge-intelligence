import type { AIChatMessage } from "@/models/AIChatMessage";

import type { FieldFillRequest, FieldSpec } from "../fill/fieldFill";

/**
 * O prompt do preenchimento de formulário.
 *
 * O vocabulário vai **inteiro no pedido**, como na sugestão de seção, e pelo
 * mesmo motivo: deixar o modelo nomear o produto livremente devolve "Eberick
 * 2024", que não existe no cadastro. A conferência na volta é o que garante —
 * isto aqui só reduz o desperdício.
 *
 * Pedir para **deixar em branco e perguntar** é a instrução mais importante
 * daqui. Um modelo que sempre preenche preenche tudo, inclusive o que o texto
 * não diz, e aí quem abriu o formulário precisa conferir os sete campos — o
 * que custa mais que digitar os sete. A lacuna admitida é o que faz a proposta
 * valer a pena.
 */
const SYSTEM = [
  "Você preenche formulários da plataforma interna da AltoQi a partir do que a pessoa escreveu.",
  "",
  "A AltoQi desenvolve software para engenharia e construção: cálculo estrutural,",
  "instalações prediais, orçamento e gestão de obras. O produto transforma",
  "atendimentos de suporte em conhecimento publicado.",
  "",
  "Regras:",
  "- Preencha **apenas** os campos listados, pelo nome exato que foi dado.",
  "- Campo de escolha aceita **somente** um dos valores listados para ele. Não invente,",
  "  não aproxime e não crie variação — se nenhum servir, deixe o campo de fora.",
  "- **Deixe de fora o campo que o texto não sustenta.** Ficar em branco é resposta",
  "  legítima e melhor que palpite: quem revisa precisa saber onde olhar.",
  "- O que faltou para preencher vira pergunta, no máximo cinco, cada uma sobre",
  "  uma informação concreta que só a pessoa tem.",
  "- A justificativa diz de onde o valor saiu, em no máximo uma frase curta.",
  "- Escreva em português, no tom de quem preenche um cadastro: sem floreio.",
].join("\n");

function describeField(field: FieldSpec): string {
  const linhas = [`- ${field.name} (${field.label})`];

  if (field.kind === "escolha") {
    const valores = (field.options ?? []).map((option) => `"${option}"`).join(", ");
    linhas.push(`  escolha exatamente um: ${valores || "(nenhum disponível)"}`);
  }

  if (field.hint) linhas.push(`  ${field.hint}`);

  return linhas.join("\n");
}

export function buildFieldFillPrompt(request: FieldFillRequest): AIChatMessage[] {
  const campos = request.fields.map(describeField).join("\n");

  /*
    O anexo é anunciado no texto porque ele chega numa parte separada do
    pedido, depois desta. Sem o aviso, um pedido só com arquivo parece um
    pedido sem fonte nenhuma — e a instrução de "deixe de fora o que o texto
    não sustenta" faria o modelo devolver tudo vazio olhando para o documento.
  */
  const fonte = [
    request.source.trim() === "" ? "" : request.source,
    request.file ? "O documento anexado a esta mensagem é a fonte. Leia-o." : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt = [
    `# FORMULÁRIO: ${request.subject}`,
    "",
    "# CAMPOS",
    "",
    campos,
    "",
    "# O QUE A PESSOA ESCREVEU OU ANEXOU",
    "",
    fonte,
    "",
    "# TAREFA",
    "",
    "Preencha o que o texto acima sustenta, e pergunte o que falta.",
    "Responda exclusivamente com JSON válido, sem markdown e sem texto em volta:",
    "",
    '{ "fields": [ { "name": "...", "value": "...", "reason": "..." } ], "questions": ["..."] }',
    "",
    "Omita o campo que o texto não sustenta. Lista vazia é resposta válida nos dois.",
  ].join("\n");

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: prompt },
  ];
}
