import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Ticket } from "@/models/Ticket";
import { findSection, type Taxonomy } from "@/models/Taxonomy";

/**
 * O levantamento — o trabalho que este produto existe para deixar de ser manual.
 *
 * Antes dele, alguém percorria o acervo à mão para descobrir o que criar,
 * atualizar ou revisar. Aqui a pergunta é a mesma, e a resposta é derivada:
 * cada achado diz **o que fazer**, **por que**, e leva para onde se faz.
 *
 * Puro, e é o ponto: o que dá para calcular sobre os dados reais é calculado, e
 * **não é rotulado como saída de IA**. Só o que exige ler texto e comparar
 * sentido é que pede modelo — e esse vem marcado como proposta, para a revisão
 * saber o que conferir com mais atenção.
 *
 * Achado que não pode ser verificado não é gerado. Um levantamento que inventa
 * tarefa custa mais que nenhum levantamento: quem seguir a lista uma vez e
 * encontrar trabalho inexistente para de seguir a lista.
 */

export const FINDING_KINDS = [
  "secao-vazia",
  "sem-secao",
  "sem-resumo",
  "parado",
  "envelhecido",
  "atendimento-sem-cobertura",
] as const;

export type FindingKind = (typeof FINDING_KINDS)[number];

/** De onde veio o achado. A distinção é regra de produto, não detalhe. */
export type FindingOrigin = "calculado" | "proposto";

export type FindingSeverity = "alta" | "media" | "baixa";

export interface Finding {
  id: string;
  kind: FindingKind;
  origin: FindingOrigin;
  severity: FindingSeverity;
  /** O que fazer, em uma linha imperativa. */
  action: string;
  /** Sobre o quê. */
  subject: string;
  /** Por que isto apareceu — a evidência, não a opinião. */
  why: string;
  href: string;
}

export interface SurveyInput {
  articles: KnowledgeArticle[];
  tickets: Ticket[];
  taxonomy: Taxonomy;
  now: Date;
}

/** Meses sem atualização a partir dos quais um publicado merece uma olhada. */
const MESES_PARA_ENVELHECER = 12;

/** Dias parado em rascunho ou revisão antes de virar achado. */
const DIAS_PARADO = 30;

const dias = (de: Date, ate: Date) => Math.floor((ate.getTime() - de.getTime()) / 86_400_000);

const severityOrder: Record<FindingSeverity, number> = { alta: 0, media: 1, baixa: 2 };

export function buildSurvey(input: SurveyInput): Finding[] {
  const { articles, tickets, taxonomy, now } = input;

  const publicados = articles.filter((article) => article.status === "published");
  const achados: Finding[] = [];

  /*
    Seção do portal sem nenhum artigo publicado.

    Só conta o publicado, pela mesma regra do resto: rascunho não cobre nada
    para quem chega no portal. E só seções de categoria de produto — as de
    apoio, como "Quero falar com o Suporte", não descrevem assunto técnico e
    apareceriam como lacuna eterna.
  */
  const produtos = new Set(
    taxonomy.categories.filter((category) => category.isProduct).map((category) => category.id)
  );

  const comArtigo = new Set(publicados.map((article) => article.sectionId));

  /*
    Agrupado por categoria, e não uma linha por seção.

    O portal tem 146 seções. Uma linha para cada uma descoberta produziu 117
    achados na primeira execução — o que não é levantamento, é a lista do portal
    inteiro, e afoga os três achados que alguém de fato resolveria hoje. Um
    produto que avisa demais é um produto cujos avisos ninguém lê, e aqui a
    consequência é pior: a lista existe justamente para dizer por onde começar.

    Por categoria a mesma informação vira mapa — "30 das 30 do Builder" diz
    onde o acervo está ausente sem mandar ninguém escrever trinta artigos.
  */
  for (const category of taxonomy.categories) {
    if (!produtos.has(category.id)) continue;

    const secoes = taxonomy.sections.filter((section) => section.categoryId === category.id);
    if (secoes.length === 0) continue;

    const vazias = secoes.filter((section) => !comArtigo.has(section.id));
    if (vazias.length === 0) continue;

    /*
      Proporção, e não número absoluto: duas seções descobertas numa categoria
      de três é lacuna; duas em trinta é trabalho normal de quem mantém acervo.
    */
    const proporcao = vazias.length / secoes.length;

    achados.push({
      id: `secao-vazia:${category.id}`,
      kind: "secao-vazia",
      origin: "calculado",
      severity: proporcao >= 0.5 ? "media" : "baixa",
      action:
        vazias.length === secoes.length
          ? "Cobrir esta categoria — nenhuma seção tem artigo"
          : `Cobrir ${vazias.length} seção(ões) desta categoria`,
      subject: category.name,
      why: `${vazias.length} de ${secoes.length} seções sem artigo publicado: ${vazias
        .slice(0, 3)
        .map((section) => section.name)
        .join(", ")}${vazias.length > 3 ? "…" : ""}.`,
      href: "/library?categoria=" + category.id,
    });
  }

  for (const article of articles) {
    const semSecao = findSection(taxonomy, article.sectionId) === undefined;

    /*
      Sem seção o artigo não é encontrado no portal e não conta como cobertura
      em lugar nenhum — é o achado mais barato de resolver e o mais caro de
      deixar, porque o artigo existe e ninguém acha.
    */
    if (semSecao) {
      achados.push({
        id: `sem-secao:${article.id}`,
        kind: "sem-secao",
        origin: "calculado",
        severity: article.status === "published" ? "alta" : "media",
        action: "Classificar numa seção",
        subject: article.title,
        why:
          article.status === "published"
            ? "Está publicado e sem seção: não conta como cobertura em nenhuma."
            : "Sem seção, ele não aparece no lugar em que seria procurado.",
        href: `/library/${article.id}`,
      });
    }

    /*
      O resumo não é enfeite: é o que a busca do produto e o contexto enviado à
      IA leem primeiro. Publicado sem resumo é publicado que a análise não
      consegue avaliar direito.
    */
    if (article.status === "published" && article.summary.trim() === "") {
      achados.push({
        id: `sem-resumo:${article.id}`,
        kind: "sem-resumo",
        origin: "calculado",
        severity: "media",
        action: "Escrever o resumo",
        subject: article.title,
        why: "É o que a busca e a análise leem antes do conteúdo.",
        href: `/library/${article.id}`,
      });
    }

    if (article.status === "draft" || article.status === "review") {
      const parado = dias(article.updatedAt, now);

      if (parado >= DIAS_PARADO) {
        achados.push({
          id: `parado:${article.id}`,
          kind: "parado",
          origin: "calculado",
          severity: parado >= DIAS_PARADO * 3 ? "alta" : "media",
          action: article.status === "review" ? "Concluir a revisão" : "Retomar ou descartar",
          subject: article.title,
          why: `Sem alteração há ${parado} dias.`,
          href: `/library/${article.id}`,
        });
      }
    }

    if (article.status === "published") {
      const meses = Math.floor(dias(article.updatedAt, now) / 30);

      if (meses >= MESES_PARA_ENVELHECER) {
        achados.push({
          id: `envelhecido:${article.id}`,
          kind: "envelhecido",
          origin: "calculado",
          severity: "baixa",
          action: "Conferir se ainda está correto",
          subject: article.title,
          /*
            Idade não é defeito, e a frase diz isso. Um artigo de dois anos pode
            estar perfeito — o achado é um convite a olhar, não uma acusação.
          */
          why: `Publicado e sem revisão há ${meses} meses.`,
          href: `/library/${article.id}`,
        });
      }
    }
  }

  /*
    Atendimento sem cobertura documental: o sinal que originou o produto.

    Aqui ele é a versão **calculada** e conservadora — atendimento cuja seção
    correspondente não tem artigo publicado ainda não existe como dado, porque
    o atendimento não guarda seção. O que dá para afirmar hoje é mais simples:
    atendimento resolvido cuja solução não virou artigo nenhum. A leitura
    semântica — "cinco atendimentos perguntam a mesma coisa" — exige modelo, e
    entra marcada como proposta.
  */
  const comArtigoDeOrigem = new Set(
    articles.map((article) => article.source?.ticketId).filter((id): id is string => !!id)
  );

  for (const ticket of tickets) {
    if (comArtigoDeOrigem.has(ticket.id)) continue;
    if (ticket.solution.trim() === "") continue;

    achados.push({
      id: `atendimento:${ticket.id}`,
      kind: "atendimento-sem-cobertura",
      origin: "calculado",
      severity: "alta",
      action: "Avaliar se vira conhecimento",
      subject: ticket.title,
      why: "Foi resolvido e nenhum artigo nasceu dele.",
      href: `/analysis?ticket=${ticket.id}`,
    });
  }

  return achados.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/** Quantos de cada tipo — o cabeçalho da tela, e nada além do que foi achado. */
export function surveySummary(findings: Finding[]) {
  return {
    total: findings.length,
    alta: findings.filter((finding) => finding.severity === "alta").length,
    calculados: findings.filter((finding) => finding.origin === "calculado").length,
    propostos: findings.filter((finding) => finding.origin === "proposto").length,
  };
}

export const findingKindLabel: Record<FindingKind, string> = {
  "secao-vazia": "Seção sem artigo",
  "sem-secao": "Artigo sem seção",
  "sem-resumo": "Sem resumo",
  parado: "Parado",
  envelhecido: "Envelhecido",
  "atendimento-sem-cobertura": "Atendimento sem artigo",
};
