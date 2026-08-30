import { describe, expect, it } from "vitest";

import type { ActivityEvent } from "@/models/ActivityEvent";

import {
  auditActors,
  auditDay,
  auditToCsv,
  defaultAuditFilters,
  filterAudit,
} from "./audit";

const evento = (extra: Partial<ActivityEvent> = {}): ActivityEvent => ({
  id: crypto.randomUUID(),
  at: "2026-08-20T12:00:00.000Z",
  type: "article_created",
  projectId: "p1",
  actor: "Ana",
  subject: { kind: "article", id: "a1", label: "Como exportar IFC" },
  detail: "",
  ...extra,
});

const filtros = (extra: Partial<typeof defaultAuditFilters> = {}) => ({
  ...defaultAuditFilters,
  ...extra,
});

describe("filterAudit", () => {
  it("sem filtro, devolve tudo do mais recente ao mais antigo", () => {
    const resultado = filterAudit(
      [evento({ at: "2026-08-01T10:00:00.000Z" }), evento({ at: "2026-08-20T10:00:00.000Z" })],
      filtros()
    );

    expect(resultado.map((item) => item.at)).toEqual([
      "2026-08-20T10:00:00.000Z",
      "2026-08-01T10:00:00.000Z",
    ]);
  });

  /*
    A pergunta de quem administra é "o que esta pessoa fez", e a linha do tempo
    não oferecia esse corte.
  */
  it("filtra por quem realizou", () => {
    const resultado = filterAudit(
      [evento({ actor: "Ana" }), evento({ actor: "Bruno" })],
      filtros({ actor: "Ana" })
    );

    expect(resultado).toHaveLength(1);
    expect(resultado[0].actor).toBe("Ana");
  });

  it("filtra por tipo de evento", () => {
    const resultado = filterAudit(
      [evento({ type: "article_created" }), evento({ type: "ticket_deleted" })],
      filtros({ type: "ticket_deleted" })
    );

    expect(resultado).toHaveLength(1);
  });

  /*
    Atravessa iniciativas de propósito: auditoria recortada por projeto deixaria
    de fora justamente a pessoa que trabalhou noutro.
  */
  it("não recorta por iniciativa", () => {
    const resultado = filterAudit(
      [evento({ projectId: "p1" }), evento({ projectId: "p9" }), evento({ projectId: "" })],
      filtros()
    );

    expect(resultado).toHaveLength(3);
  });

  it("filtra por período, com as duas pontas dentro", () => {
    const eventos = [
      evento({ at: "2026-08-01T12:00:00.000Z" }),
      evento({ at: "2026-08-10T12:00:00.000Z" }),
      evento({ at: "2026-08-20T12:00:00.000Z" }),
    ];

    expect(filterAudit(eventos, filtros({ desde: "2026-08-10", ate: "2026-08-20" }))).toHaveLength(
      2
    );
  });

  /*
    Data ilegível fica fora da janela, e não no meio dela — é a regra do painel.
    Sem filtro de data, continua aparecendo: esconder um evento porque a data
    não se lê seria perder o registro de que ele existiu.
  */
  it("data ilegível sai da janela e fica na lista sem janela", () => {
    const quebrado = evento({ at: "ontem" });

    expect(filterAudit([quebrado], filtros({ desde: "2026-08-01" }))).toHaveLength(0);
    expect(filterAudit([quebrado], filtros())).toHaveLength(1);
  });

  it("a busca alcança autor, assunto, detalhe e o rótulo do tipo", () => {
    const eventos = [
      evento({ actor: "Ana" }),
      evento({ subject: { kind: "article", id: "a2", label: "Licença" }, actor: "Bruno" }),
      evento({ detail: "Rascunho → Publicado", actor: "Carlos" }),
    ];

    expect(filterAudit(eventos, filtros({ busca: "licen" }))).toHaveLength(1);
    expect(filterAudit(eventos, filtros({ busca: "publicado" }))).toHaveLength(1);
    expect(filterAudit(eventos, filtros({ busca: "ana" }))).toHaveLength(1);
  });

  /* Quem digita "artigo" acha "Artigo": exigir o acento é errar duas vezes. */
  it("a busca ignora acento e caixa", () => {
    const resultado = filterAudit(
      [evento({ subject: { kind: "article", id: "a1", label: "Licença de operação" } })],
      filtros({ busca: "LICENCA" })
    );

    expect(resultado).toHaveLength(1);
  });
});

describe("auditDay", () => {
  /*
    Nunca os dez primeiros caracteres do ISO: um evento das 21h de 27 de agosto
    no Brasil cairia em 28, e quem procura "o dia 27" não acharia o que fez à
    noite.
  */
  it("é o dia de quem lê, e não o de Greenwich", () => {
    const noite = new Date(2026, 7, 27, 21, 0, 0);

    expect(auditDay(evento({ at: noite.toISOString() }))).toBe("2026-08-27");
  });

  it("data ilegível não vira dia nenhum", () => {
    expect(auditDay(evento({ at: "ontem" }))).toBe("");
  });
});

describe("auditActors", () => {
  it("sai do dado, e não de um cadastro", () => {
    expect(
      auditActors([evento({ actor: "Bruno" }), evento({ actor: "Ana" }), evento({ actor: "Ana" })])
    ).toEqual(["Ana", "Bruno"]);
  });

  it("evento sem autor não vira opção vazia", () => {
    expect(auditActors([evento({ actor: "  " })])).toEqual([]);
  });
});

describe("auditToCsv", () => {
  it("leva cabeçalho e uma linha por evento", () => {
    const csv = auditToCsv([evento({ actor: "Ana" })]);

    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).toContain("Quem");
    expect(csv).toContain('"Ana"');
  });

  /*
    Detalhe de evento tem vírgula e quebra de linha dentro. Sem aspas, uma linha
    vira duas na planilha e a auditoria passa a ter registros que não existem.
  */
  it("campo com vírgula, aspas e quebra de linha continua um campo", () => {
    const csv = auditToCsv([evento({ detail: 'Virou "Publicado", enfim\nna quinta' })]);

    expect(csv).toContain('"Virou ""Publicado"", enfim\nna quinta"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });

  it("a transição sai em chave, nas duas colunas", () => {
    const csv = auditToCsv([
      evento({ type: "article_status_changed", transition: { from: "draft", to: "published" } }),
    ]);

    expect(csv).toContain('"draft","published"');
  });
});
