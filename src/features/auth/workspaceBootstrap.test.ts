import { describe, expect, it } from "vitest";

import { buildPortalTaxonomy } from "@/features/taxonomy/mock/portalTaxonomy";
import { projects } from "@/features/projects/mock/projects";
import { knowledgeArticles } from "@/features/library/mock/articles";

import {
  countLocal,
  pendingCollections,
  type LocalWorkspace,
} from "./workspaceBootstrap";

/*
  Sem `window`, `readRaw` devolve `null` para toda chave. Que é exatamente o
  caso de uma coleção que nunca foi gravada. O teste mede o que a migração
  enxerga nessa situação.
*/
const taxonomy = buildPortalTaxonomy();

describe("countLocal com nenhuma chave gravada", () => {
  it("conta a semente, e não zero, quando nada foi gravado", () => {
    /*
      O produto mostra a semente enquanto ninguém edita; tratá-la como "nada"
      faria a migração subir um recorte do que a pessoa vê.

      A conta é contra o tamanho da semente, e não contra um número escrito
      aqui: as sementes de demonstração foram esvaziadas quando o produto
      passou a receber dado real, e um teste amarrado ao número antigo teria
      falhado sem que nada quebrasse.
    */
    const counts = countLocal(taxonomy);

    expect(counts.projects).toBe(projects.length);
    expect(counts.articles).toBe(knowledgeArticles.length);
    // Painéis continuam semeados: eles são pergunta, e não dado.
    expect(counts.panels).toBeGreaterThan(0);
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

describe("pendingCollections", () => {
  const vazio: LocalWorkspace = {
    projects: 0, tickets: 0, conversations: 0,
    analyses: 0, plans: 0, articles: 0, events: 0, panels: 0, follows: 0,
  };

  it("aponta o que existe aqui e não existe lá", () => {
    const local = { ...vazio, projects: 5, plans: 2 };

    expect(pendingCollections(local, vazio)).toEqual(["projects", "plans"]);
  });

  it("enxerga a migração que subiu pela metade", () => {
    // O caso real: projetos e atendimentos subiram, os planos falharam, e o
    // resto da ordem nem tentou. Antes disto a tela nunca mais voltava.
    const local = { ...vazio, projects: 5, tickets: 3, plans: 2, articles: 4 };
    const servidor = { ...vazio, projects: 5, tickets: 3 };

    expect(pendingCollections(local, servidor)).toEqual(["plans", "articles"]);
  });

  it("não reenvia coleção que já tem conteúdo no servidor", () => {
    // Linha lá significa que alguém mandou; sobrescrever descartaria trabalho.
    const local = { ...vazio, articles: 4 };
    const servidor = { ...vazio, articles: 1 };

    expect(pendingCollections(local, servidor)).toEqual([]);
  });

  it("nada pendente quando o servidor está completo", () => {
    const cheio = { ...vazio, projects: 5, articles: 4 };

    expect(pendingCollections(cheio, cheio)).toEqual([]);
  });
});
