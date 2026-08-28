import { describe, expect, it } from "vitest";

import { projectLabel } from "./projectLabel";

const projetos = [{ id: "p1", name: "Base Visus Produção" }];

describe("projectLabel", () => {
  it("nomeia a iniciativa quando ela existe", () => {
    expect(projectLabel(projetos, "p1")).toBe("Base Visus Produção");
  });

  /*
    Artigo do portal nasce sem iniciativa de propósito: o acervo é do hub. Dizer
    "não encontrado" acusava a tela de ter perdido algo que nunca existiu.
  */
  it("diz que não há iniciativa quando o campo está vazio", () => {
    expect(projectLabel(projetos, "")).toBe("Sem iniciativa");
    expect(projectLabel(projetos, "   ")).toBe("Sem iniciativa");
  });

  /* Id preenchido que não resolve é outra história: ali algo se perdeu mesmo. */
  it("avisa quando o id existe e não resolve", () => {
    expect(projectLabel(projetos, "p9")).toBe("Projeto não encontrado");
  });
});
