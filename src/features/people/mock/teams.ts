import type { Team } from "@/models/Assignment";

/**
 * As quatro equipes do suporte AltoQi, com os nomes que elas têm de fato.
 *
 * Equipe é estrutura, não dado pessoal. Por isso ela vive no código, ao
 * contrário das pessoas, que só existem depois de entrarem no produto.
 *
 * Os identificadores **não mudam** quando o nome muda. Eles são o vínculo com
 * tudo que já foi atribuído, e renomear preservando o id é a mesma regra que
 * vale para categoria e seção: o vínculo é o identificador, não o texto.
 */
export const seedTeams: Team[] = [
  { id: "team-suporte-builder-eletrica", name: "Builder Elétrica", order: 0, categoryIds: [], sectionIds: [] },
  { id: "team-suporte-builder-hidraulica", name: "Builder Hidráulica", order: 1, categoryIds: [], sectionIds: [] },
  { id: "team-suporte-estruturas", name: "Eberick Estruturas", order: 2, categoryIds: [], sectionIds: [] },
  { id: "team-suporte-visus", name: "Suporte Visus", order: 3, categoryIds: [], sectionIds: [] },
];
