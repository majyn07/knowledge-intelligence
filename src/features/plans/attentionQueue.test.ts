import { describe, expect, it } from "vitest";

import type { ActivityEvent } from "@/models/ActivityEvent";

import { buildAttentionQueue, lastActivityOf } from "./attentionQueue";
import type { PlanStatus, PlanWorkspaceItem } from "./types/PlanWorkspace";

const agora = new Date("2026-08-20T18:00:00.000Z");
const dia = (n: number) => new Date(agora.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

function plano(
  id: string,
  extra: { dueDate?: string; status?: PlanStatus; title?: string } = {}
): PlanWorkspaceItem {
  return {
    id,
    title: extra.title ?? `Plano ${id}`,
    projectName: "Base Visus",
    projectId: "p1",
    status: extra.status ?? "development",
    priority: "normal",
    owner: "",
    dueDate: extra.dueDate,
    createdAt: dia(-40),
    updatedAt: dia(-1),
    source: {
      projectId: "p1", ticketId: "t1", analysisId: "an1",
      opportunityId: "op1", analysisLabel: "", opportunityTitle: "",
    },
    document: {
      executiveSummary: "", context: "", problem: "", diagnosis: "",
      evidence: [], decisions: [], proposal: "", acceptanceCriteria: [],
      notes: "", references: [],
    },
    tasks: [],
    comments: [],
  };
}

function evento(planId: string, at: string): ActivityEvent {
  return {
    id: `ev-${planId}-${at}`,
    at,
    type: "plan_updated",
    projectId: "p1",
    actor: "",
    subject: { kind: "plan", id: planId, label: "Plano" },
    detail: "",
  };
}

describe("lastActivityOf", () => {
  it("pega o evento mais recente daquele plano", () => {
    const eventos = [evento("a", dia(-9)), evento("a", dia(-2)), evento("b", dia(-1))];

    expect(lastActivityOf("a", eventos)).toBe(dia(-2));
  });

  it("ignora evento de outro assunto com o mesmo id", () => {
    const artigo: ActivityEvent = {
      ...evento("a", dia(-1)),
      subject: { kind: "article", id: "a", label: "Artigo" },
    };

    expect(lastActivityOf("a", [artigo])).toBeUndefined();
  });

  it("sem histórico devolve indefinido, e não uma data inventada", () => {
    expect(lastActivityOf("a", [])).toBeUndefined();
  });
});

describe("buildAttentionQueue", () => {
  it("ordena atrasado, hoje, parado, próximo", () => {
    const plans = [
      plano("proximo", { dueDate: dia(2) }),
      plano("parado"),
      plano("hoje", { dueDate: dia(0) }),
      plano("atrasado", { dueDate: dia(-3) }),
    ];

    const eventos = [
      evento("proximo", dia(-1)),
      evento("parado", dia(-20)),
      evento("hoje", dia(-1)),
      evento("atrasado", dia(-1)),
    ];

    expect(buildAttentionQueue(plans, eventos, agora).map((e) => e.plan.id)).toEqual([
      "atrasado",
      "hoje",
      "parado",
      "proximo",
    ]);
  });

  it("plano no prazo e em movimento fica de fora", () => {
    // Listá-lo diluiria os que de fato precisam de atenção.
    const plans = [plano("tranquilo", { dueDate: dia(30) })];

    expect(buildAttentionQueue(plans, [evento("tranquilo", dia(-1))], agora)).toEqual([]);
  });

  it("plano sem prazo entra só se estiver parado", () => {
    const semNada = buildAttentionQueue([plano("a")], [evento("a", dia(-1))], agora);
    const parado = buildAttentionQueue([plano("b")], [evento("b", dia(-20))], agora);

    expect(semNada).toEqual([]);
    expect(parado.map((e) => e.plan.id)).toEqual(["b"]);
  });

  it("plano publicado não vence nem para — ele terminou", () => {
    const plans = [plano("pronto", { dueDate: dia(-10), status: "published" })];

    expect(buildAttentionQueue(plans, [evento("pronto", dia(-90))], agora)).toEqual([]);
  });

  it("diz por que cada item está na fila", () => {
    const fila = buildAttentionQueue(
      [plano("a", { dueDate: dia(-2) }), plano("b")],
      [evento("a", dia(-1)), evento("b", dia(-20))],
      agora
    );

    expect(fila[0].reason).toBe("atrasado 2 dias");
    expect(fila[1].reason).toBe("sem movimento há 20 dias");
  });

  it("empate mantém ordem estável, para a lista não embaralhar entre renders", () => {
    const plans = [
      plano("z", { dueDate: dia(-1), title: "Zebra" }),
      plano("a", { dueDate: dia(-1), title: "Alfa" }),
    ];

    const eventos = [evento("z", dia(-1)), evento("a", dia(-1))];
    const primeira = buildAttentionQueue(plans, eventos, agora).map((e) => e.plan.id);
    const segunda = buildAttentionQueue([...plans].reverse(), eventos, agora).map((e) => e.plan.id);

    expect(primeira).toEqual(segunda);
    expect(primeira).toEqual(["a", "z"]);
  });

  it("data de exibição antiga não vira prazo", () => {
    // Os planos guardavam "15 jul. 2026"; interpretar isso como prazo
    // produziria atraso inventado.
    const antigo = { ...plano("velho"), dueDate: "15 jul. 2026" };

    expect(buildAttentionQueue([antigo], [evento("velho", dia(-1))], agora)).toEqual([]);
  });
});
