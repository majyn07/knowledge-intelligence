import { articleStatusLabel, type KnowledgeArticle } from "@/models/KnowledgeArticle";

import { articleText } from "../content/articleText";
import { articleTermFrequency } from "../content/articleTerms";

/**
 * Comparar dois artigos que se sobrepõem.
 *
 * O Levantamento aponta o par; sozinho isso não resolve nada. A pergunta de
 * quem vai decidir é sempre a mesma — **o que este tem que aquele não tem?** —,
 * e respondê-la relendo os dois textos inteiros é o trabalho manual que este
 * produto existe para acabar.
 *
 * O que sai daqui é calculado: vocabulário só de um, só do outro, e o comum.
 * Se os dois devem virar um só é decisão de quem revisa — a IA do artigo está
 * ali para propor, marcada como proposta.
 */

export interface ArticleComparison {
  /** Termos que só o primeiro traz, do mais frequente ao menos. */
  onlyA: string[];
  /** Termos que só o segundo traz. */
  onlyB: string[];
  /** Termos que os dois trazem. */
  shared: string[];
  /** Vocabulário em comum, de 0 a 1. */
  score: number;
}

/** Aparições mínimas para um termo contar como assunto, e não menção de passagem. */
const MINIMO_DE_APARICOES = 2;

export function compareArticles(
  a: KnowledgeArticle,
  b: KnowledgeArticle,
  limite = 20
): ArticleComparison {
  const fa = articleTermFrequency(a);
  const fb = articleTermFrequency(b);

  const relevantes = (mapa: Map<string, number>, outro: Map<string, number>, dentro: boolean) =>
    [...mapa.entries()]
      .filter(([palavra, vezes]) => outro.has(palavra) === dentro && vezes >= MINIMO_DE_APARICOES)
      .sort((x, y) => y[1] - x[1])
      .slice(0, limite)
      .map(([palavra]) => palavra);

  let comuns = 0;
  for (const palavra of fa.keys()) if (fb.has(palavra)) comuns += 1;

  const uniao = fa.size + fb.size - comuns;

  return {
    onlyA: relevantes(fa, fb, false),
    onlyB: relevantes(fb, fa, false),
    shared: relevantes(fa, fb, true),
    score: uniao === 0 ? 0 : comuns / uniao,
  };
}

export interface FieldDifference {
  label: string;
  a: string;
  b: string;
  /** Verdadeiro quando os dois lados dizem a mesma coisa. */
  same: boolean;
}

/**
 * A comparação dos atributos, campo a campo.
 *
 * Deliberadamente sem veredito: a tela mostra o que cada um diz e marca o que
 * difere. Qual dos dois está certo é julgamento, e julgamento aqui é de gente.
 */
export function compareFields(
  a: KnowledgeArticle,
  b: KnowledgeArticle,
  sectionNameOf: (sectionId: string) => string
): FieldDifference[] {
  const dia = (data: Date) => dayOf(data);
  const tamanho = (article: KnowledgeArticle) =>
    `${articleText(article).length.toLocaleString("pt-BR")} caracteres`;

  const campos: FieldDifference[] = [
    { label: "Seção", a: sectionNameOf(a.sectionId), b: sectionNameOf(b.sectionId), same: false },
    {
      label: "Estágio",
      // O rótulo, não a chave: "published" é contrato, "Publicado" é o que se lê.
      a: articleStatusLabel[a.status],
      b: articleStatusLabel[b.status],
      same: false,
    },
    { label: "Atualizado em", a: dia(a.updatedAt), b: dia(b.updatedAt), same: false },
    { label: "Tamanho", a: tamanho(a), b: tamanho(b), same: false },
    { label: "Responsável", a: a.author || "não definido", b: b.author || "não definido", same: false },
    { label: "Resumo", a: a.summary || "sem resumo", b: b.summary || "sem resumo", same: false },
  ];

  return campos.map((campo) => ({ ...campo, same: campo.a === campo.b }));
}

import { dayOf } from "@/lib/dates";