import { z } from "zod";

/**
 * Sugestão de seção do portal para artigo que entrou sem classificação.
 *
 * A importação por arquivo deixa muito artigo sem seção de propósito: o nome
 * que vem no arquivo raramente bate com o cadastro, e encaixar no mais parecido
 * seria a classificação inventada que o produto recusa. Isso resolve o problema
 * de origem e cria outro — alguém teria de classificar centenas à mão.
 *
 * Aqui a IA **propõe**, e a revisão humana aprova. É a mesma regra da equipe
 * sugerida pelo cadastro e da análise do atendimento: nada rotulado como saída
 * de modelo entra no acervo sem alguém dizer sim.
 */

/** O que o cliente manda: o artigo resumido e o vocabulário permitido. */
export const sectionSuggestionRequestSchema = z
  .object({
    articles: z
      .array(
        z
          .object({
            id: z.string().min(1),
            title: z.string().min(1),
            summary: z.string(),
            /** Recorte do conteúdo. O artigo inteiro não cabe, e não precisa. */
            excerpt: z.string(),
          })
          .strict()
      )
      .min(1)
      .max(25),
    sections: z
      .array(
        z
          .object({
            id: z.string().min(1),
            /** "Categoria › Seção", que é como a pessoa lê no cadastro. */
            path: z.string().min(1),
          })
          .strict()
      )
      .min(1),
  })
  .strict();

export type SectionSuggestionRequest = z.infer<typeof sectionSuggestionRequestSchema>;

export const CONFIDENCE = ["alta", "media", "baixa"] as const;
export type SuggestionConfidence = (typeof CONFIDENCE)[number];

export interface SectionSuggestion {
  articleId: string;
  sectionId: string;
  confidence: SuggestionConfidence;
  reason: string;
}

/**
 * Lê o que o modelo devolveu, e **descarta o que ele inventou**.
 *
 * Duas defesas, e as duas já foram necessárias em outro lugar deste produto:
 * o identificador precisa existir no vocabulário que mandamos — modelo devolve
 * id plausível que nunca existiu —, e o artigo precisa ser um dos que
 * perguntamos, senão uma resposta desalinhada classificaria o registro errado.
 *
 * Sugestão descartada é sugestão que não aparece. Ela não vira "sem seção" com
 * cara de resposta: o artigo simplesmente continua onde estava, que é o estado
 * verdadeiro.
 */
export function parseSectionSuggestions(
  raw: unknown,
  request: SectionSuggestionRequest
): SectionSuggestion[] {
  const secoes = new Set(request.sections.map((section) => section.id));
  const artigos = new Set(request.articles.map((article) => article.id));

  const bruto = typeof raw === "string" ? safeJson(raw) : raw;
  const lista = extractList(bruto);

  const vistos = new Set<string>();
  const resultado: SectionSuggestion[] = [];

  for (const item of lista) {
    if (typeof item !== "object" || item === null) continue;

    const registro = item as Record<string, unknown>;
    const articleId = text(registro.articleId);
    const sectionId = text(registro.sectionId);

    if (!artigos.has(articleId) || !secoes.has(sectionId)) continue;

    // Uma sugestão por artigo: duas para o mesmo registro seriam duas
    // respostas para a mesma pergunta, e a tela teria de escolher sozinha.
    if (vistos.has(articleId)) continue;
    vistos.add(articleId);

    const confidence = text(registro.confidence).toLowerCase();

    resultado.push({
      articleId,
      sectionId,
      confidence: (CONFIDENCE as readonly string[]).includes(confidence)
        ? (confidence as SuggestionConfidence)
        : "baixa",
      reason: text(registro.reason).slice(0, 240),
    });
  }

  return resultado;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeJson(raw: string): unknown {
  /*
    O modelo às vezes devolve o JSON cercado de crase, apesar de pedirmos que
    não. Recusar por causa da cerca desperdiçaria uma resposta correta.
  */
  const limpo = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  try {
    return JSON.parse(limpo);
  } catch {
    return null;
  }
}

function extractList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "object" && value !== null) {
    const lista = (value as Record<string, unknown>).suggestions;
    if (Array.isArray(lista)) return lista;
  }

  return [];
}
