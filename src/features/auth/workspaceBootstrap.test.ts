import { describe, expect, it } from "vitest";

import { buildPortalTaxonomy } from "@/features/taxonomy/mock/portalTaxonomy";

import { countLocal } from "./workspaceBootstrap";

/*
  Sem `window`, `readRaw` devolve `null` para toda chave — que é exatamente o
  caso de uma coleção que nunca foi gravada. O teste mede o que a migração
  enxerga nessa situação.
*/
const taxonomy = buildPortalTaxonomy();

describe("countLocal com nenhuma chave gravada", () => {
  it("cai na semente em vez de reportar vazio", () => {
    // O produto mostra a semente enquanto ninguém edita; tratá-la como "nada"
    // faria a migração subir um recorte do que a pessoa vê.
    const counts = countLocal(taxonomy);

    expect(counts.projects).toBeGreaterThan(0);
    expect(counts.articles).toBeGreaterThan(0);
  });

  it("nunca reporta filho sem o pai que ele referencia", () => {
    /*
      A invariante que quebrou de verdade: a tela ofereceu 3 atendimentos, 2
      planos e 4 artigos com 0 projetos, porque só `visus-projects` não tinha
      sido gravada. Subir assim violaria a chave estrangeira de `project_id`.
    */
    const counts = countLocal(taxonomy);

    for (const filho of ["tickets", "plans", "articles", "analyses"] as const) {
      if (counts[filho] > 0) {
        expect(
          counts.projects,
          `${filho} tem ${counts[filho]} registros, e todos referenciam projeto`
        ).toBeGreaterThan(0);
      }
    }

    if (counts.conversations > 0) {
      expect(counts.tickets).toBeGreaterThan(0);
    }
  });
});
