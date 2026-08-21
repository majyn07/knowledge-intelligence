import { describe, expect, it } from "vitest";

import type { ActivityEvent } from "@/models/ActivityEvent";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Taxonomy } from "@/models/Taxonomy";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";

import { reconcileSpec, type PanelSpec } from "./panelSpec";
import { runPanel, type PanelData } from "./runPanel";

const agora = new Date("2026-08-20T12:00:00.000Z");
const dia = (n: number) => new Date(agora.getTime() + n * 24 * 60 * 60 * 1000);
const iso = (n: number) => dia(n).toISOString();

const taxonomia: Taxonomy = {
  categories: [
    { id: "cat-builder", name: "AltoQi Builder", isProduct: true, order: 0 },
    { id: "cat-visus", name: "AltoQi Visus", isProduct: true, order: 1 },
  ],
  sections: [
    { id: "sec-eletrica", categoryId: "cat-builder", name: "Elétrica", order: 0 },
    { id: "sec-hidraulica", categoryId: "cat-builder", name: "Hidráulica", order: 1 },
  ],
  genres: [{ id: "gen-faq", name: "FAQ", order: 0 }],
  opportunityTypes: [{ id: "opt-novo", name: "Novo artigo", order: 0 }],
};

function base(): PanelData {
  return {
    projects: [
      { id: "p1", name: "Projeto Um" } as PanelData["projects"][number],
      { id: "p2", name: "Projeto Dois" } as PanelData["projects"][number],
    ],
    tickets: [],
    analyses: [],
    plans: [],
    articles: [],
    events: [],
    taxonomy: taxonomia,
    people: [
      {
        id: "pes-1",
        name: "Raoni",
        role: "Suporte",
        email: "r@altoqi.com.br",
        teamId: "eq-visus",
        avatarUrl: "",
        isActive: true,
      },
    ],
    teams: [
      { id: "eq-visus", name: "Suporte Visus", order: 0, categoryIds: [], sectionIds: [] },
      { id: "eq-eletrica", name: "Suporte Builder Elétrica", order: 1, categoryIds: [], sectionIds: [] },
    ],
    activeProjectId: "p1",
  };
}

function artigo(over: Partial<KnowledgeArticle>): KnowledgeArticle {
  return {
    id: "a1",
    title: "Artigo",
    summary: "",
    content: "",
    projectId: "p1",
    genreId: "gen-faq",
    status: "draft",
    sectionId: "sec-eletrica",
    tags: [],
    keywords: [],
    author: "eq-visus",
    contentFormat: "markdown" as const,
    createdAt: dia(-1),
    updatedAt: dia(-1),
    ...over,
  };
}

function plano(over: Partial<PlanWorkspaceItem>): PlanWorkspaceItem {
  return {
    id: "pl1",
    title: "Plano",
    projectName: "Projeto Um",
    projectId: "p1",
    status: "analysis",
    priority: "normal",
    owner: "eq-visus",
    createdAt: iso(-1),
    updatedAt: iso(-1),
    source: {} as PlanWorkspaceItem["source"],
    document: {} as PlanWorkspaceItem["document"],
    tasks: [],
    comments: [],
    ...over,
  };
}

function analise(over: Partial<AnalysisRecord>): AnalysisRecord {
  return {
    id: "an1",
    projectId: "p1",
    ticketId: "t1",
    status: "open",
    startedAt: iso(-1),
    result: { opportunities: [] } as unknown as AnalysisRecord["result"],
    relatedArticles: [],
    messages: [],
    ...over,
  };
}

function evento(over: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: "e1",
    at: iso(-1),
    type: "article_status_changed",
    projectId: "p1",
    actor: "",
    subject: { kind: "article", id: "a1", label: "Artigo" },
    detail: "",
    ...over,
  };
}

function spec(over: Partial<PanelSpec>): PanelSpec {
  return reconcileSpec({
    id: "s1",
    title: "Painel",
    source: "articles",
    breakdown: "none",
    visual: "number",
    window: 30,
    scopedToProject: false,
    order: 0,
    ...over,
  });
}

describe("janela", () => {
  it("conta só o que está dentro dela", () => {
    const data = base();
    data.articles = [
      artigo({ id: "dentro", createdAt: dia(-5) }),
      artigo({ id: "fora", createdAt: dia(-90) }),
    ];

    expect(runPanel(spec({ window: 30 }), data, agora).total).toBe(1);
    expect(runPanel(spec({ window: null }), data, agora).total).toBe(2);
  });

  it("lê a data do atendimento no formato em que ela foi gravada", () => {
    /*
      O atendimento guarda "15/07/2026" desde a primeira versão, e `new Date`
      devolve inválido para isso. Sem ler esse formato, o painel de
      atendimentos mostrava zero com três atendimentos na tela.
    */
    const data = base();
    data.tickets = [
      { id: "t1", projectId: "p1", title: "A", solution: "", company: "", date: "18/08/2026" },
      { id: "t2", projectId: "p1", title: "B", solution: "", company: "", date: "10/03/2026" },
    ];

    expect(runPanel(spec({ source: "tickets", window: 30 }), data, agora).total).toBe(1);
    expect(runPanel(spec({ source: "tickets", window: null }), data, agora).total).toBe(2);
  });

  it("dia de calendário cai no mês em que ele está, e não no anterior", () => {
    /*
      `new Date("2026-08-01")` é meia-noite em Greenwich, que no Brasil ainda é
      31 de julho. Sem ler o dia como local, o atendimento do primeiro dia do
      mês apareceria no mês anterior — e o erro só aparece na virada, que é
      justamente onde ninguém olharia para conferir.
    */
    const data = base();
    data.tickets = [
      { id: "t1", projectId: "p1", title: "A", solution: "", company: "", date: "2026-08-01" },
    ];

    const rows = runPanel(
      spec({ source: "tickets", breakdown: "month", visual: "bar", window: null }),
      data,
      agora
    ).rows;

    expect(rows).toEqual([{ key: "2026-08", label: "ago/26", value: 1 }]);
  });

  it("dia que não existe não vira o mês seguinte em silêncio", () => {
    // "31/02/2026" viraria 3 de março, e o registro apareceria num mês em que
    // nada aconteceu.
    const data = base();
    data.tickets = [
      { id: "t1", projectId: "p1", title: "A", solution: "", company: "", date: "31/02/2026" },
    ];

    expect(runPanel(spec({ source: "tickets", window: 365 }), data, agora).total).toBe(0);
  });

  it("data ilegível vira ressalva, e não some calada", () => {
    /*
      Quem lê veria um total menor que o número de registros na tela e não
      teria como saber por quê.
    */
    const data = base();
    data.plans = [plano({ id: "antigo", createdAt: "Ontem, 16:20" })];

    const result = runPanel(spec({ source: "plans", window: 30 }), data, agora);

    expect(result.total).toBe(0);
    expect(result.caveat).toContain("1 registro");
  });

  it("desde o início não carrega ressalva de data", () => {
    // Sem janela, ninguém ficou de fora — não há o que ressalvar.
    const data = base();
    data.plans = [plano({ id: "antigo", createdAt: "Ontem, 16:20" })];

    expect(runPanel(spec({ source: "plans", window: null }), data, agora).caveat).toBeUndefined();
  });

  it("data ilegível fica de fora da janela e dentro do desde o início", () => {
    /*
      Plano migrado guarda "Ontem, 16:20". Chutar um instante para ele seria
      inventar quando o trabalho aconteceu — mas ele existe, e o total geral
      precisa incluí-lo.
    */
    const data = base();
    data.plans = [plano({ id: "antigo", createdAt: "Ontem, 16:20" })];

    expect(runPanel(spec({ source: "plans", window: 30 }), data, agora).total).toBe(0);
    expect(runPanel(spec({ source: "plans", window: null }), data, agora).total).toBe(1);
  });
});

describe("recorte por projeto", () => {
  it("respeita o projeto ativo quando o painel pede", () => {
    const data = base();
    data.articles = [artigo({ id: "a", projectId: "p1" }), artigo({ id: "b", projectId: "p2" })];

    expect(runPanel(spec({ scopedToProject: true }), data, agora).total).toBe(1);
    expect(runPanel(spec({ scopedToProject: false }), data, agora).total).toBe(2);
  });

  it("sem projeto ativo, painel escopado conta tudo em vez de zerar", () => {
    // Zerar diria "não há artigos", quando a verdade é "não há projeto ativo".
    const data = base();
    data.activeProjectId = null;
    data.articles = [artigo({ id: "a", projectId: "p1" }), artigo({ id: "b", projectId: "p2" })];

    expect(runPanel(spec({ scopedToProject: true }), data, agora).total).toBe(2);
  });
});

describe("quebras", () => {
  it("por estágio", () => {
    const data = base();
    data.articles = [
      artigo({ id: "a", status: "published" }),
      artigo({ id: "b", status: "published" }),
      artigo({ id: "c", status: "draft" }),
    ];

    const rows = runPanel(spec({ breakdown: "status", visual: "bar" }), data, agora).rows;

    expect(rows).toEqual([
      { key: "published", label: "Publicado", value: 2 },
      { key: "draft", label: "Rascunho", value: 1 },
    ]);
  });

  it("por categoria chega pela seção, não por campo próprio", () => {
    // Guardar as duas no artigo permitiria que divergissem.
    const data = base();
    data.articles = [
      artigo({ id: "a", sectionId: "sec-eletrica" }),
      artigo({ id: "b", sectionId: "sec-hidraulica" }),
    ];

    const result = runPanel(spec({ breakdown: "category", visual: "bar" }), data, agora);

    expect(result.rows).toEqual([{ key: "cat-builder", label: "AltoQi Builder", value: 2 }]);
  });

  it("classificação vazia aparece como Não definido, e não some", () => {
    /*
      Artigo sem seção é informação. Escondê-lo faria a soma das linhas não
      bater com o total, e ninguém saberia por quê.
    */
    const data = base();
    data.articles = [artigo({ id: "a", sectionId: "" }), artigo({ id: "b" })];

    const result = runPanel(spec({ breakdown: "section", visual: "bar" }), data, agora);

    expect(result.total).toBe(2);
    expect(result.rows.reduce((soma, row) => soma + row.value, 0)).toBe(2);
    expect(result.rows.some((row) => row.label === "Não definido")).toBe(true);
  });

  it("por equipe resolve pessoa para a equipe dela", () => {
    // O recorte desta fase é por equipe; a pessoa responde pela dela.
    const data = base();
    data.articles = [artigo({ id: "a", author: "pes-1" }), artigo({ id: "b", author: "eq-visus" })];

    const result = runPanel(spec({ breakdown: "team", visual: "bar" }), data, agora);

    expect(result.rows).toEqual([{ key: "eq-visus", label: "Suporte Visus", value: 2 }]);
  });

  it("por equipe reconhece o nome guardado por versão anterior", () => {
    const data = base();
    data.articles = [artigo({ id: "a", author: "Suporte Builder Elétrica" })];

    const result = runPanel(spec({ breakdown: "team", visual: "bar" }), data, agora);

    expect(result.rows[0].key).toBe("eq-eletrica");
  });

  it("por mês ordena cronologicamente, não por volume", () => {
    /*
      Ordenar série temporal por tamanho esconde a tendência, que é a única
      coisa que ela tem a dizer.
    */
    const data = base();
    data.articles = [
      artigo({ id: "a", createdAt: new Date("2026-06-10T12:00:00.000Z") }),
      artigo({ id: "b", createdAt: new Date("2026-07-10T12:00:00.000Z") }),
      artigo({ id: "c", createdAt: new Date("2026-07-11T12:00:00.000Z") }),
      artigo({ id: "d", createdAt: new Date("2026-08-01T12:00:00.000Z") }),
    ];

    const rows = runPanel(
      spec({ breakdown: "month", visual: "bar", window: null }),
      data,
      agora
    ).rows;

    expect(rows.map((row) => row.key)).toEqual(["2026-06", "2026-07", "2026-08"]);
  });
});

describe("cruzamento de duas dimensões", () => {
  function acervo() {
    const data = base();
    data.articles = [
      artigo({ id: "a", status: "published", sectionId: "sec-eletrica" }),
      artigo({ id: "b", status: "published", sectionId: "sec-eletrica" }),
      artigo({ id: "c", status: "draft", sectionId: "sec-hidraulica" }),
      artigo({ id: "d", status: "draft", sectionId: "" }),
    ];
    return data;
  }

  const cruzado = spec({
    breakdown: "status",
    breakdown2: "section",
    visual: "table",
    window: null,
  });

  it("a tabela soma o mesmo que a lista simples", () => {
    /*
      A linha cruzada é apurada sobre as mesmas linhas de \`group\`, e não
      recalculada: apurar duas vezes é exatamente como as duas deixam de bater.
    */
    const result = runPanel(cruzado, acervo(), agora);

    expect(result.total).toBe(4);
    expect(result.matrix).toBeDefined();

    for (const row of result.matrix!.rows) {
      expect(row.values.reduce((soma, valor) => soma + valor, 0)).toBe(row.total);
    }
  });

  it("cada célula conta o cruzamento certo", () => {
    const matrix = runPanel(cruzado, acervo(), agora).matrix!;

    const publicado = matrix.rows.find((row) => row.key === "published")!;
    const elétrica = matrix.columns.findIndex((column) => column.key === "sec-eletrica");

    expect(publicado.values[elétrica]).toBe(2);
  });

  it("a coluna sem classificação vai para o fim, e não some", () => {
    // Ela costuma ser a maior enquanto a classificação está incompleta, e na
    // frente empurraria para a direita justamente as colunas que importam.
    const matrix = runPanel(cruzado, acervo(), agora).matrix!;

    expect(matrix.columns[matrix.columns.length - 1].label).toBe("Não definido");
  });

  it("sem segunda quebra não há tabela cruzada", () => {
    const result = runPanel(spec({ breakdown: "status", visual: "bar" }), acervo(), agora);

    expect(result.matrix).toBeUndefined();
  });
});

describe("oportunidades", () => {
  it("conta as oportunidades dentro das análises da janela", () => {
    const data = base();
    data.analyses = [
      analise({
        id: "an1",
        result: {
          opportunities: [
            { id: "o1", type: "opt-novo", status: "approved" },
            { id: "o2", type: "opt-novo", status: "proposed" },
          ],
        } as unknown as AnalysisRecord["result"],
      }),
    ];

    const result = runPanel(spec({ source: "opportunities", breakdown: "status", visual: "bar" }), data, agora);

    expect(result.total).toBe(2);
    expect(result.rows.map((row) => row.label).sort()).toEqual(["Aprovada", "Proposta"]);
  });

  it("tipo fora do cadastro cai em Não definido em vez de sumir", () => {
    // A IA pode sugerir algo que a equipe não cadastrou, e quem revisa decide.
    const data = base();
    data.analyses = [
      analise({
        result: {
          opportunities: [{ id: "o1", type: "inexistente", status: "proposed" }],
        } as unknown as AnalysisRecord["result"],
      }),
    ];

    const result = runPanel(spec({ source: "opportunities", breakdown: "type", visual: "bar" }), data, agora);

    expect(result.rows).toEqual([{ key: "__sem__", label: "Não definido", value: 1 }]);
  });
});

describe("chegadas", () => {
  it("conta chegadas ao estágio, e não registros parados nele", () => {
    const data = base();
    data.events = [
      evento({ id: "e1", subject: { kind: "article", id: "a", label: "A" }, transition: { from: "review", to: "published" } }),
      evento({ id: "e2", subject: { kind: "article", id: "b", label: "B" }, transition: { from: "draft", to: "review" } }),
    ];

    expect(runPanel(spec({ source: "arrivals", stage: "published" }), data, agora).total).toBe(1);
    expect(runPanel(spec({ source: "arrivals", stage: "review" }), data, agora).total).toBe(1);
  });

  it("evento anterior ao campo de transição vira ressalva, não zero calado", () => {
    /*
      Um evento antigo não deixa de ter acontecido por não saber dizer para
      onde foi. Somar os dois como se fossem a mesma coisa produziria um
      número que ninguém consegue conferir.
    */
    const data = base();
    data.events = [
      evento({ id: "e1", transition: { from: "review", to: "published" } }),
      evento({ id: "e2" }),
    ];

    const result = runPanel(spec({ source: "arrivals", stage: "published" }), data, agora);

    expect(result.total).toBe(1);
    expect(result.caveat).toContain("1 mudança");
  });

  it("histórico completo não carrega ressalva", () => {
    const data = base();
    data.events = [evento({ transition: { from: "review", to: "published" } })];

    expect(runPanel(spec({ source: "arrivals", stage: "published" }), data, agora).caveat).toBeUndefined();
  });

  it("quebra por tipo de registro separa artigo de plano", () => {
    const data = base();
    data.events = [
      evento({ id: "e1", transition: { from: "review", to: "published" } }),
      evento({
        id: "e2",
        type: "plan_status_changed",
        subject: { kind: "plan", id: "pl1", label: "Plano" },
        transition: { from: "approved", to: "published" },
      }),
    ];

    const rows = runPanel(
      spec({ source: "arrivals", stage: "published", breakdown: "kind", visual: "bar" }),
      data,
      agora
    ).rows;

    expect(rows.map((row) => row.label).sort()).toEqual(["Artigo", "Plano"]);
  });
});

describe("reconcileSpec", () => {
  it("quebra que a origem não responde volta para sem quebra", () => {
    // "Atendimentos por gênero" produziria uma coluna vazia com cara de dado.
    const corrigido = reconcileSpec({
      id: "s",
      title: "t",
      source: "tickets",
      breakdown: "genre",
      visual: "bar",
      window: 30,
      scopedToProject: false,
      order: 0,
    });

    expect(corrigido.breakdown).toBe("none");
  });

  it("número único com quebra vira barras", () => {
    const corrigido = reconcileSpec({
      id: "s",
      title: "t",
      source: "articles",
      breakdown: "status",
      visual: "number",
      window: 30,
      scopedToProject: false,
      order: 0,
    });

    expect(corrigido.visual).toBe("bar");
  });

  it("chegadas sem estágio recebem o fim do ciclo", () => {
    const corrigido = reconcileSpec({
      id: "s",
      title: "t",
      source: "arrivals",
      breakdown: "none",
      visual: "number",
      window: 30,
      scopedToProject: false,
      order: 0,
    });

    expect(corrigido.stage).toBe("published");
  });

  it("segunda quebra sem a primeira é descartada", () => {
    // Sem a primeira ela seria a primeira, e não um cruzamento.
    const corrigido = reconcileSpec({
      id: "s",
      title: "t",
      source: "articles",
      breakdown: "none",
      breakdown2: "status",
      visual: "table",
      window: 30,
      scopedToProject: false,
      order: 0,
    });

    expect(corrigido.breakdown2).toBeUndefined();
  });

  it("cruzar uma dimensão com ela mesma é descartado", () => {
    // Produziria uma diagonal: uma coluna útil e o resto zerado.
    const corrigido = reconcileSpec({
      id: "s",
      title: "t",
      source: "articles",
      breakdown: "status",
      breakdown2: "status",
      visual: "table",
      window: 30,
      scopedToProject: false,
      order: 0,
    });

    expect(corrigido.breakdown2).toBeUndefined();
  });

  it("cruzamento força tabela", () => {
    // Barra empilhada esconderia metade dos números.
    const corrigido = reconcileSpec({
      id: "s",
      title: "t",
      source: "articles",
      breakdown: "status",
      breakdown2: "genre",
      visual: "bar",
      window: 30,
      scopedToProject: false,
      order: 0,
    });

    expect(corrigido.visual).toBe("table");
    expect(corrigido.breakdown2).toBe("genre");
  });

  it("trocar a origem remove o cruzamento que ela não responde", () => {
    /*
      A segunda quebra precisa sair do resultado, e não só ser sobrescrita: o
      espalhamento do registro anterior a traria de volta.
    */
    const corrigido = reconcileSpec({
      id: "s",
      title: "t",
      source: "tickets",
      breakdown: "project",
      breakdown2: "genre",
      visual: "table",
      window: 30,
      scopedToProject: false,
      order: 0,
    });

    expect("breakdown2" in corrigido).toBe(false);
  });

  it("estágio só sobrevive na origem que o usa", () => {
    const corrigido = reconcileSpec({
      id: "s",
      title: "t",
      source: "articles",
      breakdown: "none",
      visual: "number",
      window: 30,
      stage: "published",
      scopedToProject: false,
      order: 0,
    });

    expect(corrigido.stage).toBeUndefined();
  });
});
