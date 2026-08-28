import { describe, expect, it } from "vitest";

import { equipesDeAtendimento, sugerirEquipe, toOwnerTeams } from "./ownerTeams";

const dono = (email: string, teams: string[], archived = false) => ({
  id: "1",
  email,
  archived,
  teams: teams.map((name, i) => ({ id: String(i), name })),
});

describe("toOwnerTeams", () => {
  it("reduz o dono ao vínculo e-mail → equipes", () => {
    const donos = toOwnerTeams({
      results: [dono("Alguem@AltoQi.com.br", ["Suporte Visus"])],
    });

    expect(donos).toEqual([{ email: "alguem@altoqi.com.br", teams: ["Suporte Visus"] }]);
  });

  /*
    Quem atende costuma estar em equipes de outras áreas, e trazer todas faria
    a sugestão oferecer "Marketing" para quem responde chamado.
  */
  it("fica só com as equipes de atendimento", () => {
    const donos = toOwnerTeams({
      results: [dono("a@altoqi.com.br", ["Marketing", "Suporte Builder", "Financeiro"])],
    });

    expect(donos[0].teams).toEqual(["Suporte Builder"]);
  });

  it("descarta quem não tem nenhuma equipe de atendimento", () => {
    expect(toOwnerTeams({ results: [dono("a@altoqi.com.br", ["Marketing"])] })).toEqual([]);
  });

  it("descarta dono arquivado", () => {
    expect(toOwnerTeams({ results: [dono("a@altoqi.com.br", ["Setup"], true)] })).toEqual([]);
  });

  it("descarta dono sem e-mail", () => {
    expect(toOwnerTeams({ results: [dono("  ", ["Setup"])] })).toEqual([]);
  });

  it("não quebra com resposta fora de forma", () => {
    expect(toOwnerTeams(null)).toEqual([]);
    expect(toOwnerTeams({})).toEqual([]);
  });
});

describe("sugerirEquipe", () => {
  const donos = [
    { email: "so-setup@altoqi.com.br", teams: ["Setup"] },
    {
      email: "nas-seis@altoqi.com.br",
      teams: ["Suporte Builder", "Suporte Visus", "Suporte Estruturas"],
    },
    { email: "repetida@altoqi.com.br", teams: ["Setup", "Setup"] },
  ];

  it("propõe quando há uma equipe só", () => {
    expect(sugerirEquipe(donos, "so-setup@altoqi.com.br")).toBe("Setup");
  });

  /*
    As seis equipes de Suporte da conta têm exatamente as mesmas dezoito
    pessoas. Propor uma delas seria escolher por sorteio e apresentar isso
    como decisão.
  */
  it("não propõe nada quando a pessoa está em várias", () => {
    expect(sugerirEquipe(donos, "nas-seis@altoqi.com.br")).toBeNull();
  });

  /* A HubSpot repete a mesma equipe quando ela aparece em hierarquias. */
  it("nome repetido conta uma vez", () => {
    expect(sugerirEquipe(donos, "repetida@altoqi.com.br")).toBe("Setup");
  });

  it("ignora caixa e espaço no e-mail", () => {
    expect(sugerirEquipe(donos, "  SO-SETUP@AltoQi.com.br ")).toBe("Setup");
  });

  it("quem não está na HubSpot não recebe sugestão", () => {
    expect(sugerirEquipe(donos, "outro@altoqi.com.br")).toBeNull();
    expect(sugerirEquipe(donos, "")).toBeNull();
  });
});

describe("equipesDeAtendimento", () => {
  it("lista as equipes existentes, sem repetir e em ordem", () => {
    const nomes = equipesDeAtendimento([
      { email: "a@x", teams: ["Suporte Visus", "Setup"] },
      { email: "b@x", teams: ["Setup"] },
    ]);

    expect(nomes).toEqual(["Setup", "Suporte Visus"]);
  });
});
