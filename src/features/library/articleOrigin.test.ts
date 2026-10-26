import { describe, expect, it } from "vitest";

import { juntarOrigem, normalizarOrigem } from "./articleOrigin";

describe("normalizarOrigem", () => {
  it("guarda atendimentos e termos sem repetir", () => {
    expect(
      normalizarOrigem({ ticketIds: ["a", "a", "b"], termos: ["laje", "laje"], em: "2026-10-26T10:00:00Z" })
    ).toEqual({ ticketIds: ["a", "b"], termos: ["laje"], em: "2026-10-26T10:00:00Z" });
  });

  it("sem atendimento não há origem", () => {
    expect(normalizarOrigem({ ticketIds: [], termos: ["x"] })).toBeUndefined();
    expect(normalizarOrigem(null)).toBeUndefined();
    expect(normalizarOrigem({ ticketIds: [3, ""] })).toBeUndefined();
  });
});

describe("juntarOrigem", () => {
  const primeira = { ticketIds: ["a"], termos: ["laje"], em: "2026-10-01T00:00:00Z" };
  const segunda = { ticketIds: ["a", "b"], termos: ["viga"], em: "2026-10-26T00:00:00Z" };

  it("soma os atendimentos e mantém a data da primeira", () => {
    expect(juntarOrigem(primeira, segunda)).toEqual({
      ticketIds: ["a", "b"],
      termos: ["laje", "viga"],
      em: "2026-10-01T00:00:00Z",
    });
  });

  it("sem nova, fica a atual; sem atual, vale a nova", () => {
    expect(juntarOrigem(primeira, undefined)).toBe(primeira);
    expect(juntarOrigem(undefined, segunda)).toBe(segunda);
  });
});
