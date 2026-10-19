import { describe, expect, it } from "vitest";

import { toPerson } from "./peopleRepository";

const perfil = { id: "p1", name: "Ana", role: "", email: "ana@altoqi.com.br" };

describe("toPerson: a última visita aos avisos", () => {
  /*
    A central compara texto. O Postgres devolve "+00" onde o produto grava "Z",
    e "+" vem antes de "Z": sem converter, um evento posterior à visita
    pareceria anterior, e o aviso sumiria sem ter sido lido.
  */
  it("converte o formato do Postgres para o ISO que a central compara", () => {
    expect(toPerson({ ...perfil, notices_seen_at: "2026-10-19 12:00:00+00" }).noticesSeenAt).toBe(
      "2026-10-19T12:00:00.000Z"
    );
  });

  it("nunca visto, ou data ilegível, é ausente: melhor um aviso a mais que um a menos", () => {
    expect(toPerson({ ...perfil, notices_seen_at: null }).noticesSeenAt).toBeUndefined();
    expect(toPerson({ ...perfil, notices_seen_at: "ontem" }).noticesSeenAt).toBeUndefined();
    expect(toPerson(perfil).noticesSeenAt).toBeUndefined();
  });
});
