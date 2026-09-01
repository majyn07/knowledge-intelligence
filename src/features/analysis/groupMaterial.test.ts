import { describe, expect, it } from "vitest";

import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import { ATENDIMENTOS_NO_MATERIAL, materialDoGrupo } from "./groupMaterial";
import type { TriageGroup } from "./triage";

let sequencia = 0;

const ticket = (extra: Partial<Ticket> = {}): Ticket =>
  ({
    id: `tic-${(sequencia += 1)}`,
    title: "Modelo IFC abre deslocado no Eberick",
    solution: "Reposicione o modelo na origem antes de exportar.",
    date: "2026-08-01",
    ...extra,
  }) as Ticket;

const conversa = (ticketId: string, falas: string[]): SupportConversation =>
  ({
    id: `con-${(sequencia += 1)}`,
    ticketId,
    messages: falas.map((body, i) => ({
      id: `msg-${ticketId}-${i}`,
      role: "cliente" as const,
      author: "Cliente",
      body,
      createdAt: "2026-08-01T10:00:00.000Z",
    })),
  }) as SupportConversation;

const grupo = (extra: Partial<TriageGroup> = {}): TriageGroup => ({
  id: "grp-1",
  subject: "Modelo IFC abre deslocado",
  tickets: [ticket()],
  terms: ["ifc", "deslocado", "origem"],
  coverage: 0.33,
  score: 8,
  ...extra,
});

describe("materialDoGrupo", () => {
  /*
    A pergunta é do cliente e a resposta é do suporte, e as duas precisam ir: só
    a pergunta produz um artigo que descreve o problema e não o resolve.
  */
  it("leva o que o cliente relatou e como o suporte resolveu", () => {
    const alvo = ticket();

    const { material } = materialDoGrupo(grupo({ tickets: [alvo] }), [
      conversa(alvo.id, ["O modelo IFC abre a duzentos metros da origem."]),
    ]);

    expect(material).toContain("duzentos metros da origem");
    expect(material).toContain("Reposicione o modelo na origem");
  });

  /*
    "24 atendimentos pediram isto" separa um artigo que vale escrever de um que
    atende um caso só, e o modelo não tem como saber isso pelos textos.
  */
  it("diz quantos atendimentos pediram o assunto", () => {
    const muitos = Array.from({ length: 24 }, () => ticket());

    const { material, total } = materialDoGrupo(grupo({ tickets: muitos }), []);

    expect(total).toBe(24);
    expect(material).toContain("24 atendimentos sobre isto");
  });

  /* O grupo inteiro não cabe num pedido, e a amostra é dita como amostra. */
  it("entra uma amostra, e ela é anunciada", () => {
    const muitos = Array.from({ length: 24 }, () => ticket());

    const { material, usados } = materialDoGrupo(grupo({ tickets: muitos }), []);

    expect(usados).toBe(ATENDIMENTOS_NO_MATERIAL);
    expect(material).toContain("como amostra");
  });

  it("grupo pequeno não fala em amostra", () => {
    const { material, usados } = materialDoGrupo(grupo({ tickets: [ticket(), ticket()] }), []);

    expect(usados).toBe(2);
    expect(material).not.toContain("amostra");
  });

  /*
    O assunto que chega há dois anos mudou de forma no caminho — versão, nome de
    menu — e o artigo tem de responder ao que chega hoje.
  */
  it("os mais recentes entram primeiro", () => {
    const antigo = ticket({ title: "Chamado antigo", date: "2024-01-10" });
    const novo = ticket({ title: "Chamado recente", date: "2026-08-20" });

    const { material } = materialDoGrupo(grupo({ tickets: [antigo, novo] }), []);

    expect(material.indexOf("Chamado recente")).toBeLessThan(material.indexOf("Chamado antigo"));
  });

  /*
    Sem o corte, entra a assinatura e o expediente do suporte: medido no acervo,
    38% do que ia ao modelo era enfeite.
  */
  it("a resposta do suporte vai sem assinatura", () => {
    const alvo = ticket({
      solution:
        "Reposicione o modelo na origem.\n--\nAtenciosamente,\nEquipe AltoQi\nAtendimento das 9h às 18h",
    });

    const { material } = materialDoGrupo(grupo({ tickets: [alvo] }), []);

    expect(material).toContain("Reposicione o modelo na origem");
    expect(material).not.toContain("Atenciosamente");
    expect(material).not.toContain("9h às 18h");
  });

  /*
    O clique de menu do bot aparece em quase toda conversa e não descreve nada:
    passando do limiar, ele é enfeite e sai.
  */
  it("o que se repete em toda conversa não entra como relato", () => {
    const alvos = Array.from({ length: 5 }, () => ticket());

    const conversas = alvos.map((t, i) =>
      conversa(t.id, ["Estou ciente e desejo continuar", `Problema específico número ${i}`])
    );

    const { material } = materialDoGrupo(grupo({ tickets: alvos }), conversas);

    expect(material).not.toContain("Estou ciente e desejo continuar");
    expect(material).toContain("Problema específico");
  });

  it("grupo sem conversa nenhuma ainda produz material, e não quebra", () => {
    const { material } = materialDoGrupo(grupo(), []);

    expect(material).toContain("Modelo IFC abre deslocado");
    expect(material.length).toBeGreaterThan(40);
  });

  it("atendimento sem data não derruba a ordenação", () => {
    const semData = ticket({ title: "Sem data", date: "" });

    const { material } = materialDoGrupo(grupo({ tickets: [semData, ticket()] }), []);

    expect(material).toContain("Sem data");
  });
});
