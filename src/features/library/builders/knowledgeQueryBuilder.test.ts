import { describe, expect, it } from "vitest";

import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";
import { emptyClassification } from "@/models/TicketClassification";

import { buildKnowledgeQuery } from "./knowledgeQueryBuilder";

const atendimento = (extra: Partial<Ticket> = {}): Ticket => ({
  id: "tic-1",
  projectId: "p1",
  title: "Importar IFC no Eberick",
  solution: "Orientado a usar atualização completa do 3D.",
  company: "Construtora",
  ...emptyClassification(),
  date: "2026-08-01",
  ...extra,
});

const conversa = (corpos: string[]): SupportConversation => ({
  id: "conv-1",
  ticketId: "tic-1",
  messages: corpos.map((body, indice) => ({
    id: `m${indice}`,
    author: "Alguém",
    role: indice % 2 === 0 ? "cliente" : "suporte",
    body,
    createdAt: "2026-08-01T10:00:00.000Z",
  })),
});

describe("buildKnowledgeQuery", () => {
  it("junta assunto, solução e conversa", () => {
    const query = buildKnowledgeQuery(atendimento(), conversa(["O modelo não aparece na aba 3D"]));

    expect(query.text).toContain("Eberick");
    expect(query.text).toContain("modelo");
    expect(query.company).toBe("Construtora");
  });

  /*
    O caso real: um chamado de importação de IFC no Eberick trouxe como artigo
    relacionado um texto sobre o Visus Cost Management, ligado por "situação,
    neste, atendimento, identificamos, solicitação". A conversa de suporte é
    quase toda correspondência, e sem o corte é ela que casa.
  */
  it("tira a correspondência antes de virar consulta", () => {
    const query = buildKnowledgeQuery(
      atendimento(),
      conversa([
        "Prezado cliente, identificamos a situação neste atendimento.",
        "Atenciosamente, equipe de suporte. Acesse https://suporte.altoqi.com.br/hc/artigo",
        "Atendemos das 9h as 12h.",
      ])
    );

    for (const ruido of [
      "Prezado",
      "identificamos",
      "situação",
      "Atenciosamente",
      "suporte.altoqi.com.br",
      "13h30",
      "9h",
    ]) {
      expect(query.text).not.toContain(ruido);
    }
  });

  it("preserva o termo técnico que descreve o problema", () => {
    const query = buildKnowledgeQuery(
      atendimento({ title: "Fissuração na viga contínua" }),
      conversa(["Prezado cliente, a fissuração aparece na laje também."])
    );

    expect(query.text).toContain("Fissuração");
    expect(query.text).toContain("laje");
    expect(query.text).toContain("viga");
  });

  it("funciona sem conversa", () => {
    const query = buildKnowledgeQuery(atendimento());

    expect(query.text).toContain("Eberick");
    expect(query.limit).toBe(5);
  });
});
