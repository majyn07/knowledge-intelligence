import type { Team } from "@/models/Assignment";

/**
 * As quatro equipes reais do suporte AltoQi.
 *
 * Equipe é estrutura, não dado pessoal — por isso ela vive no código, ao
 * contrário das pessoas, que só existem depois de entrarem no produto.
 *
 * Os identificadores são os mesmos da migração `0006_equipes.sql`. Divergir
 * aqui faria o modo local e o compartilhado discordarem sobre o que é a mesma
 * equipe, e as atribuições parariam de resolver na virada.
 */
export const seedTeams: Team[] = [
  { id: "team-suporte-builder-eletrica", name: "Suporte Builder Elétrica", order: 0 },
  { id: "team-suporte-builder-hidraulica", name: "Suporte Builder Hidráulica", order: 1 },
  { id: "team-suporte-estruturas", name: "Suporte Estruturas", order: 2 },
  { id: "team-suporte-visus", name: "Suporte Visus", order: 3 },
];
