import type { AIChatMessage } from "@/models/AIChatMessage";

import type { CoverageRequest } from "../library/coverage";

/**
 * O prompt de "o acervo já responde isto?".
 *
 * São **duas perguntas numa**, e a ordem importa: primeiro se o assunto já está
 * coberto, depois — só se não estiver — o rascunho. Invertida, o modelo escreve
 * o artigo e depois racionaliza que ele era necessário, que é exatamente o viés
 * que esta tela existe para evitar.
 *
 * **Preferir atualizar é regra do produto, e vai escrita.** Um acervo de 1.822
 * artigos piora mais por dobrar assunto do que por ter um artigo a menos: quem
 * procura acha um dos dois e não sabe do outro. Por isso "parcial" tem de
 * apontar o que falta no artigo existente, e não virar desculpa para um novo.
 *
 * Os modelos entram como **forma, não como conteúdo**. Sem eles o rascunho sai
 * num formato que não se parece com os outros — outra estrutura, outro tom,
 * outra ordem — e quem revisa gasta o tempo reformatando em vez de conferindo.
 */
const SYSTEM = [
  "Você avalia se a base de conhecimento do suporte da AltoQi já responde a um assunto,",
  "antes de alguém escrever um artigo novo.",
  "",
  "A AltoQi desenvolve software para engenharia e construção: cálculo estrutural,",
  "instalações prediais, orçamento e gestão de obras.",
  "",
  "Responda em duas etapas, nesta ordem:",
  "",
  "1. COBERTURA. Leia o material e os artigos existentes e decida:",
  "   - 'coberta': um artigo existente já resolve o caso. Não proponha rascunho.",
  "   - 'parcial': um artigo existente trata do assunto e deixa parte de fora.",
  "   - 'ausente': nenhum artigo trata disto.",
  "",
  "2. RASCUNHO, apenas quando for 'parcial' ou 'ausente'.",
  "",
  "Regras:",
  "- Cite **apenas** os identificadores de artigo que foram fornecidos. Não invente.",
  "- Prefira atualizar a criar. Com 'parcial', diga com precisão o que falta no artigo",
  "  existente — é isso que decide entre editar aquele e escrever outro.",
  "- Semelhança de palavras não é cobertura. Dois textos podem citar 'licença' e",
  "  responder dúvidas diferentes; o que conta é se a pessoa resolveria o caso lendo",
  "  o artigo existente.",
  "- O rascunho segue a **forma** dos artigos-modelo: mesma estrutura de seções, mesmo",
  "  tom, mesma profundidade. Não copie o conteúdo deles.",
  "- Escreva o conteúdo do rascunho em Markdown simples: títulos, listas e negrito.",
  "- Nunca invente passo, caminho de menu, número de versão ou mensagem de erro que",
  "  não esteja no material. O que faltar, deixe indicado para quem revisa completar.",
  "- Português do Brasil, direto, sem preâmbulo.",
].join("\n");

function bloco(titulo: string, corpo: string): string {
  return corpo.trim() === "" ? "" : `# ${titulo}\n\n${corpo}`;
}

export function buildCoveragePrompt(request: CoverageRequest): AIChatMessage[] {
  const candidatos = request.candidatos
    .map((artigo) =>
      [
        `## ${artigo.id}`,
        `Título: ${artigo.title}`,
        artigo.summary ? `Resumo: ${artigo.summary}` : "",
        artigo.excerpt ? `Trecho: ${artigo.excerpt}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");

  const modelos = request.modelos
    .map((artigo) =>
      [`Título: ${artigo.title}`, artigo.summary ? `Resumo: ${artigo.summary}` : "", artigo.excerpt]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n---\n\n");

  const partes = [
    bloco("MATERIAL A DOCUMENTAR", request.material),
    /*
      A ausência é dita, e não omitida: sem candidato nenhum o modelo precisa
      saber que a busca rodou e não achou, senão ele pode supor que a lista foi
      esquecida e hesitar em responder "ausente".
    */
    bloco(
      "ARTIGOS QUE O ACERVO JÁ TEM SOBRE ISTO",
      candidatos || "Nenhum artigo do acervo se aproxima deste assunto."
    ),
    bloco(
      "ARTIGOS-MODELO (para a forma do rascunho, não para o conteúdo)",
      modelos || "Nenhum modelo disponível: use uma estrutura simples e direta."
    ),
  ].filter(Boolean);

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: partes.join("\n\n") },
  ];
}
