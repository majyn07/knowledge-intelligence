import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Ticket } from "@/models/Ticket";
import { findSection, sectionPath, type Taxonomy } from "@/models/Taxonomy";

import { findDuplicates, findOverlaps } from "./overlap";

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
  "sobreposicao",
  "duplicado",
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

/**
 * Até quantos achados do mesmo tipo valem uma linha cada.
 *
 * Acima disso a lista deixa de dizer por onde começar e vira o inventário do
 * acervo — e o caminho de resolução também muda: deixa de ser abrir um
 * registro e passa a ser o mutirão de uma tela.
 */
const INDIVIDUAL_ATE = 5;

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

  /*
    Sem seção o artigo não é encontrado no portal e não conta como cobertura em
    lugar nenhum — é o achado mais barato de resolver e o mais caro de deixar,
    porque o artigo existe e ninguém acha.

    Um por artigo enquanto forem poucos, e **um só** acima disso. Depois de uma
    importação, "sem seção" é a condição de centenas de registros de uma vez: a
    primeira execução com o acervo real produziu 600 linhas iguais, que é a
    mesma falha das seções vazias — a lista deixa de dizer por onde começar.
    Acima do punhado, o caminho não é abrir um artigo, é o mutirão da Biblioteca
    com a sugestão de seção.
  */
  const semSecao = articles.filter(
    (article) => findSection(taxonomy, article.sectionId) === undefined
  );

  if (semSecao.length > INDIVIDUAL_ATE) {
    const publicados = semSecao.filter((article) => article.status === "published").length;

    achados.push({
      id: "sem-secao:lote",
      kind: "sem-secao",
      origin: "calculado",
      severity: publicados > 0 ? "alta" : "media",
      action: `Classificar ${semSecao.length} artigos sem seção`,
      subject: "Acervo sem classificação",
      why:
        publicados > 0
          ? `${publicados} deles estão publicados e não contam como cobertura em nenhuma seção. A Biblioteca sugere a seção de todos de uma vez.`
          : "Sem seção, eles não aparecem no lugar em que seriam procurados.",
      href: "/library?categoria=unset",
    });
  } else {
    for (const article of semSecao) {
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
  }

  for (const article of articles) {
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

  /*
    Artigos que se sobrepõem dentro da mesma seção.

    É o único achado que exige o acervo inteiro na mão — antes da importação do
    portal não havia o que comparar. E é o problema clássico de uma base que
    cresceu por anos: dois artigos ensinando a mesma coisa, cada um respondendo
    metade, e quem procura encontra um dos dois sem saber do outro.

    **O que está calculado é vocabulário em comum, e o achado diz isso.**
    Concluir que são duplicata exige ler e comparar sentido; aqui sai o número
    e a evidência, e quem decide é a revisão — com a IA do artigo à disposição
    para propor, marcada como proposta.
  */
  /*
    O mesmo artigo publicado mais de uma vez.

    Vem antes da sobreposição porque **não é julgamento**: mesmo título, mesma
    seção. Não é preciso ler nada para saber que há um problema, e por isso a
    severidade é alta enquanto a da sobreposição é média.
  */
  for (const grupo of findDuplicates(articles)) {
    const quantos = grupo.articles.length;

    achados.push({
      id: `duplicado:${grupo.articles.map((article) => article.id).join(":")}`,
      kind: "duplicado",
      origin: "calculado",
      severity: "alta",
      action: `Decidir qual dos ${quantos} fica`,
      subject: grupo.title,
      /*
        O `why` é texto puro: a tela o mostra como veio. Marcação de Markdown
        aqui sairia com os asteriscos à mostra — e o grupo sem seção precisa de
        frase própria, senão vira "com o mesmo título em ,".
      */
      why: (() => {
        const caminho = sectionPath(taxonomy, grupo.sectionId);
        const onde = caminho ? `em ${caminho}` : "e ainda sem seção";

        return grupo.identical
          ? `${quantos} artigos com o mesmo título, ${onde}, com o conteúdo idêntico ` +
            `caractere a caractere. São cópias no ar ao mesmo tempo.`
          : `${quantos} artigos com o mesmo título, ${onde}, e o conteúdo diverge entre ` +
            `eles. Quem procura acha um sem saber que o outro existe e diz outra coisa.`;
      })(),
      /*
        Dois vão para a comparação; três ou mais não cabem nela, e a busca pelo
        título é o caminho honesto — a tela mostra os três lado a lado na lista.
      */
      href:
        quantos === 2
          ? `/library/comparar?a=${grupo.articles[0].id}&b=${grupo.articles[1].id}`
          : `/library?busca=${encodeURIComponent(grupo.title)}`,
    });
  }

  const { pairs, skippedSections } = findOverlaps(articles);

  if (pairs.length > INDIVIDUAL_ATE) {
    achados.push({
      id: "sobreposicao:lote",
      kind: "sobreposicao",
      origin: "calculado",
      severity: "media",
      action: `Revisar ${pairs.length} pares de artigos que se sobrepõem`,
      subject: "Acervo com conteúdo repetido",
      why:
        `Cada par está na mesma seção e compartilha boa parte do vocabulário — ` +
        `o mais próximo, ${Math.round(pairs[0].score * 100)}%. Dois artigos sobre o mesmo ` +
        `assunto dividem a resposta entre si, e quem procura acha só um deles.`,
      href: "/library",
    });
  } else {
    for (const par of pairs) {
      achados.push({
        id: `sobreposicao:${par.a.id}:${par.b.id}`,
        kind: "sobreposicao",
        origin: "calculado",
        severity: "media",
        action: "Comparar e decidir se viram um só",
        subject: `${par.a.title} · ${par.b.title}`,
        why:
          `Na mesma seção (${sectionPath(taxonomy, par.sectionId)}), com ` +
          `${Math.round(par.score * 100)}% do vocabulário em comum` +
          (par.shared.length ? `: ${par.shared.slice(0, 5).join(", ")}.` : "."),
        /*
          Leva para a comparação, e não para um dos dois: o achado é sobre o
          par, e abrir só um deles devolve a pessoa ao trabalho de procurar o
          outro à mão.
        */
        href: `/library/comparar?a=${par.a.id}&b=${par.b.id}`,
      });
    }
  }

  /*
    Seção grande demais para comparar aos pares é **anunciada**, não pulada em
    silêncio: número parcial apresentado como completo é pior que número com
    ressalva — a mesma regra do funil de estágios.
  */
  if (skippedSections.length > 0) {
    achados.push({
      id: "sobreposicao:nao-comparadas",
      kind: "sobreposicao",
      origin: "calculado",
      severity: "baixa",
      action: `Conferir à mão ${skippedSections.length} seção(ões) grande(s) demais para comparar`,
      subject: "Sobreposição não medida em parte do acervo",
      why:
        `A comparação é aos pares e cresce ao quadrado. Estas seções passam do teto ` +
        `e ficaram de fora da medição: ${skippedSections
          .map((id) => sectionPath(taxonomy, id))
          .slice(0, 3)
          .join("; ")}.`,
      href: "/library",
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
  sobreposicao: "Artigos que se sobrepõem",
  duplicado: "Artigo publicado mais de uma vez",
};
