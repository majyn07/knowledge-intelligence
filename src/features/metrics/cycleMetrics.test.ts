import { describe, expect, it } from "vitest";

import type { ActivityEvent, ActivityType } from "@/models/ActivityEvent";

import {
  arrivalsAt,
  averageDaysTo,
  buildFunnel,
  countArrivals,
  transitionCoverage,
} from "./cycleMetrics";

const agora = new Date("2026-08-20T12:00:00.000Z").getTime();
const dia = (n: number) => new Date(agora + n * 24 * 60 * 60 * 1000).toISOString();

const janela = { from: agora - 30 * 24 * 60 * 60 * 1000, to: agora };

function evento(
  id: string,
  at: string,
  transition?: { from: string; to: string },
  type: ActivityType = "article_status_changed",
  kind: ActivityEvent["subject"]["kind"] = "article"
): ActivityEvent {
  return {
    id: `${id}-${at}-${transition?.to ?? "x"}`,
    at,
    type,
    projectId: "p1",
    actor: "",
    subject: { kind, id, label: `Artigo ${id}` },
    detail: "",
    ...(transition ? { transition } : {}),
  };
}

describe("transitionCoverage", () => {
  it("separa o que responde por destino do que não responde", () => {
    // Eventos anteriores ao campo não têm transição, e a tela precisa poder
    // dizer que o número é parcial em vez de apresentá-lo como completo.
    const events = [
      evento("a", dia(-2), { from: "review", to: "published" }),
      evento("b", dia(-3)),
      evento("c", dia(-4), { from: "draft", to: "review" }),
    ];

    expect(transitionCoverage(events)).toEqual({
      total: 3,
      structured: 2,
      legacy: 1,
      isComplete: false,
    });
  });

  it("histórico sem mudança de estágio conta como completo", () => {
    expect(transitionCoverage([]).isComplete).toBe(true);
  });

  it("ignora evento que não é mudança de estágio", () => {
    const criado = evento("a", dia(-1), undefined, "article_created");

    expect(transitionCoverage([criado]).total).toBe(0);
  });
});

describe("countArrivals", () => {
  it("responde quantos chegaram ao estágio na janela", () => {
    // A pergunta que não tinha resposta antes do campo existir.
    const events = [
      evento("a", dia(-2), { from: "review", to: "published" }),
      evento("b", dia(-5), { from: "review", to: "published" }),
      evento("c", dia(-1), { from: "draft", to: "review" }),
    ];

    expect(countArrivals(events, "published", janela)).toBe(2);
    expect(countArrivals(events, "review", janela)).toBe(1);
  });

  it("evento sem transição não entra na contagem", () => {
    const events = [evento("a", dia(-2)), evento("b", dia(-2), { from: "review", to: "published" })];

    expect(countArrivals(events, "published", janela)).toBe(1);
  });

  it("fora da janela não conta", () => {
    const events = [evento("a", dia(-90), { from: "review", to: "published" })];

    expect(countArrivals(events, "published", janela)).toBe(0);
  });

  it("filtra por tipo de registro quando pedido", () => {
    const events = [
      evento("a", dia(-2), { from: "review", to: "published" }, "article_status_changed", "article"),
      evento("p", dia(-2), { from: "approved", to: "published" }, "plan_status_changed", "plan"),
    ];

    expect(countArrivals(events, "published", janela)).toBe(2);
    expect(countArrivals(events, "published", janela, "article")).toBe(1);
  });
});

describe("buildFunnel", () => {
  it("conta chegadas, não registros parados no estágio", () => {
    /*
      Um artigo que passou por revisão e foi publicado passou pelos dois.
      Contar só onde ele está agora esconderia metade do caminho.
    */
    const events = [
      evento("a", dia(-5), { from: "draft", to: "review" }),
      evento("a", dia(-2), { from: "review", to: "published" }),
    ];

    const funil = buildFunnel(
      events,
      [
        { stage: "review", label: "Em revisão" },
        { stage: "published", label: "Publicado" },
      ],
      janela
    );

    expect(funil.map((step) => step.arrivals)).toEqual([1, 1]);
  });

  it("estágio sem chegada aparece com zero, e não some", () => {
    const funil = buildFunnel([], [{ stage: "published", label: "Publicado" }], janela);

    expect(funil).toEqual([{ stage: "published", label: "Publicado", arrivals: 0 }]);
  });
});

describe("averageDaysTo", () => {
  it("mede da primeira aparição até a chegada", () => {
    const events = [
      evento("a", dia(-10), undefined, "article_created"),
      evento("a", dia(-4), { from: "review", to: "published" }),
    ];

    expect(averageDaysTo(events, "published", janela)).toBe(6);
  });

  it("média de várias chegadas", () => {
    const events = [
      evento("a", dia(-10), undefined, "article_created"),
      evento("a", dia(-4), { from: "review", to: "published" }),
      evento("b", dia(-8), undefined, "article_created"),
      evento("b", dia(-6), { from: "review", to: "published" }),
    ];

    expect(averageDaysTo(events, "published", janela)).toBe(4);
  });

  it("ninguém chegou devolve nulo, e não zero", () => {
    // Média de nada é nada. Zero diria "chega instantaneamente".
    expect(averageDaysTo([], "published", janela)).toBeNull();
  });

  it("quem ainda não chegou fica de fora da média", () => {
    /*
      Incluí-lo puxaria a média para baixo, dizendo que o ciclo é mais rápido
      do que é.
    */
    const events = [
      evento("a", dia(-10), undefined, "article_created"),
      evento("a", dia(-4), { from: "review", to: "published" }),
      evento("b", dia(-30), undefined, "article_created"),
    ];

    expect(averageDaysTo(events, "published", janela)).toBe(6);
  });
});

describe("arrivalsAt", () => {
  it("devolve os registros por trás do número", () => {
    // É o que torna o número clicável: indicador que não abre é indicador em
    // que ninguém confia.
    const events = [
      evento("a", dia(-2), { from: "review", to: "published" }),
      evento("b", dia(-5), { from: "review", to: "published" }),
    ];

    expect(arrivalsAt(events, "published", janela).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("o mesmo registro chegando duas vezes aparece uma", () => {
    // Recolhido e publicado de novo: são dois eventos, um registro.
    const events = [
      evento("a", dia(-9), { from: "review", to: "published" }),
      evento("a", dia(-2), { from: "review", to: "published" }),
    ];

    expect(arrivalsAt(events, "published", janela)).toHaveLength(1);
  });

  it("mais recente primeiro", () => {
    const events = [
      evento("velho", dia(-20), { from: "review", to: "published" }),
      evento("novo", dia(-1), { from: "review", to: "published" }),
    ];

    expect(arrivalsAt(events, "published", janela).map((i) => i.id)).toEqual(["novo", "velho"]);
  });
});
