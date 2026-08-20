import { describe, expect, it } from "vitest";

import { sectionPath, sectionsOf, type Taxonomy } from "@/models/Taxonomy";

import { buildPortalTaxonomy } from "./mock/portalTaxonomy";
import { normalizeTaxonomy, parseTaxonomy } from "./normalizeTaxonomy";
import {
  addCategory,
  addEntry,
  addSection,
  removeCategory,
  removeEntry,
  removeSection,
  renameCategory,
  renameSection,
} from "./taxonomyService";

const portal = buildPortalTaxonomy();

describe("semente do portal", () => {
  it("traz as 13 categorias e as 146 seções levantadas", () => {
    expect(portal.categories).toHaveLength(13);
    expect(portal.sections).toHaveLength(146);
  });

  it("mantém o volume por categoria", () => {
    const count = (name: string) =>
      sectionsOf(portal, portal.categories.find((c) => c.name === name)!.id).length;

    expect(count("AltoQi Builder")).toBe(50);
    expect(count("AltoQi Eberick")).toBe(38);
    expect(count("Elétrico")).toBe(18);
    expect(count("AltoQi Visus")).toBe(8);
  });

  it("não colide id quando o nome se repete entre categorias", () => {
    // "Interface", "Cadastro", "Configurações" e "Outros" existem em mais de uma.
    const ids = portal.sections.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("separa linha de produto de área de apoio", () => {
    const products = portal.categories.filter((c) => c.isProduct);

    expect(products.map((c) => c.name)).toContain("AltoQi Builder");
    expect(products.map((c) => c.name)).not.toContain("QiOnboarding");
  });

  it("deixa vazias as categorias que não foram confirmadas", () => {
    const pending = ["AltoQi Visus Workflow", "Quero falar com o Suporte"];

    for (const name of pending) {
      const category = portal.categories.find((c) => c.name === name)!;
      expect(sectionsOf(portal, category.id)).toEqual([]);
    }
  });
});

describe("cadastro de categoria e seção", () => {
  it("cria categoria e recusa nome repetido, ignorando acento e caixa", () => {
    const um = addCategory(portal, "Área de Testes", true);
    const dois = addCategory(um, "area de testes", true);

    expect(um.categories).toHaveLength(14);
    expect(dois.categories).toHaveLength(14);
  });

  it("recusa nome vazio", () => {
    expect(addCategory(portal, "   ", true).categories).toHaveLength(13);
  });

  it("remover categoria leva junto as seções dela", () => {
    const builder = portal.categories.find((c) => c.name === "AltoQi Builder")!;
    const depois = removeCategory(portal, builder.id);

    expect(depois.categories).toHaveLength(12);
    expect(depois.sections).toHaveLength(146 - 50);
  });

  it("seção só entra em categoria existente", () => {
    expect(addSection(portal, "cat-inexistente", "Nova").sections).toHaveLength(146);
  });

  it("aceita o mesmo nome de seção em categorias diferentes", () => {
    const visus = portal.categories.find((c) => c.name === "AltoQi Visus")!;
    const depois = addSection(portal, visus.id, "Interface");

    expect(sectionsOf(depois, visus.id).map((s) => s.name)).toContain("Interface");
    expect(new Set(depois.sections.map((s) => s.id)).size).toBe(147);
  });

  it("renomear preserva o id, que é o vínculo com o artigo", () => {
    const alvo = portal.sections[0];
    const depois = renameSection(portal, alvo.id, "Outro nome");

    expect(depois.sections[0].id).toBe(alvo.id);
    expect(depois.sections[0].name).toBe("Outro nome");
  });

  it("renomear categoria com nome vazio não apaga o nome atual", () => {
    const alvo = portal.categories[0];

    expect(renameCategory(portal, alvo.id, "  ").categories[0].name).toBe(alvo.name);
  });

  it("remover seção não mexe nas outras", () => {
    const alvo = portal.sections[0];
    const depois = removeSection(portal, alvo.id);

    expect(depois.sections).toHaveLength(145);
    expect(depois.categories).toHaveLength(13);
  });
});

describe("listas simples", () => {
  it("cria e recusa repetido", () => {
    const um = addEntry(portal, "genres", "Nota técnica");

    expect(um.genres).toHaveLength(6);
    expect(addEntry(um, "genres", "nota tecnica").genres).toHaveLength(6);
  });

  it("nunca remove o último item, para o formulário não ficar sem opção", () => {
    let taxonomy: Taxonomy = portal;

    for (const entry of portal.opportunityTypes) {
      taxonomy = removeEntry(taxonomy, "opportunityTypes", entry.id);
    }

    expect(taxonomy.opportunityTypes).toHaveLength(1);
  });

  it("mantém o gênero que o produto já usava", () => {
    expect(portal.genres.map((g) => g.name)).toEqual([
      "Artigo",
      "FAQ",
      "Workflow",
      "Documento",
      "Template",
    ]);
  });
});

describe("normalizeTaxonomy", () => {
  it("devolve estrutura vazia para conteúdo irreconhecível", () => {
    expect(normalizeTaxonomy(null).categories).toEqual([]);
    expect(normalizeTaxonomy("qualquer coisa").sections).toEqual([]);
  });

  it("descarta categoria sem id em vez de inventar um", () => {
    const taxonomy = normalizeTaxonomy({
      categories: [{ name: "Sem id" }, { id: "cat-ok", name: "Com id" }],
    });

    expect(taxonomy.categories).toHaveLength(1);
    expect(taxonomy.categories[0].id).toBe("cat-ok");
  });

  it("descarta seção cuja categoria não existe mais", () => {
    const taxonomy = normalizeTaxonomy({
      categories: [{ id: "cat-a", name: "A" }],
      sections: [
        { id: "sec-a-1", categoryId: "cat-a", name: "Fica" },
        { id: "sec-b-1", categoryId: "cat-b", name: "Sai" },
      ],
    });

    expect(taxonomy.sections.map((s) => s.name)).toEqual(["Fica"]);
  });

  it("completa a ordem ausente com a posição da lista", () => {
    const taxonomy = normalizeTaxonomy({
      categories: [
        { id: "cat-a", name: "A" },
        { id: "cat-b", name: "B", order: "não é número" },
      ],
    });

    expect(taxonomy.categories.map((c) => c.order)).toEqual([0, 1]);
  });

  it("sobrevive a registro gravado antes da taxonomia existir", () => {
    const taxonomy = normalizeTaxonomy({});

    expect(taxonomy.genres).toEqual([]);
    expect(taxonomy.opportunityTypes).toEqual([]);
  });
});

describe("parseTaxonomy", () => {
  it("cai para a semente quando o registro guardado não tem categoria", () => {
    expect(parseTaxonomy("{}").categories).toHaveLength(13);
    expect(parseTaxonomy("null").sections).toHaveLength(146);
  });

  it("preserva o cadastro do usuário quando ele existe", () => {
    const guardado = JSON.stringify({
      categories: [{ id: "cat-meu", name: "Meu", isProduct: true, order: 0 }],
      sections: [],
      genres: [],
      opportunityTypes: [],
    });

    expect(parseTaxonomy(guardado).categories).toHaveLength(1);
  });
});

describe("sectionPath", () => {
  it("monta categoria e seção", () => {
    const secao = portal.sections.find((s) => s.name === "Pranchas")!;

    expect(sectionPath(portal, secao.id)).toBe("AltoQi Builder · Pranchas");
  });

  it("devolve vazio para seção que não existe mais, em vez de inventar nome", () => {
    expect(sectionPath(portal, "sec-que-nao-existe")).toBe("");
  });
});
