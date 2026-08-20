import type { Person } from "@/models/Person";

/**
 * Semente de atribuição.
 *
 * As quatro entradas de equipe são as reais do suporte AltoQi. A pessoa é uma
 * só, e é quem conduz o projeto — nenhum outro nome de colaborador entra no
 * código: o cadastro acontece dentro do app.
 *
 * Pessoa e equipe ainda dividem o mesmo registro, que é o defeito de modelo
 * conhecido. A separação vem na sprint de contas.
 */
export const people: Person[] = [
  {
    id: "person-001",
    name: "Suporte Builder Elétrica",
    role: "Equipe de suporte",
  },
  {
    id: "person-002",
    name: "Suporte Builder Hidráulica",
    role: "Equipe de suporte",
  },
  {
    id: "person-003",
    name: "Suporte Estruturas",
    role: "Equipe de suporte",
  },
  {
    id: "person-004",
    name: "Suporte Visus",
    role: "Equipe de suporte",
  },
  {
    id: "person-005",
    name: "Raoni Milioli da Silva",
    role: "Conhecimento",
  },
];
