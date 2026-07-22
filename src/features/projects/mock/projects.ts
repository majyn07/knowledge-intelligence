import type { Project } from "@/models/Project";

export const projects: Project[] = [
  {
    id: "project-001",
    name: "Base Visus Produção",
    client: "AltoQi",
    description:
      "Projeto principal destinado à evolução da Base de Conhecimento do Visus.",
    status: "active",
    createdAt: new Date("2026-07-15"),
    updatedAt: new Date("2026-07-15"),
  },
  {
    id: "project-002",
    name: "Workflow Corporativo",
    client: "Construtora Horizonte",
    description:
      "Padronização dos fluxos de atendimento e documentação técnica.",
    status: "active",
    createdAt: new Date("2026-06-02"),
    updatedAt: new Date("2026-06-02"),
  },
  {
    id: "project-003",
    name: "Planejamento 4D",
    client: "Engenharia Beta",
    description:
      "Revisão da documentação e artigos relacionados ao módulo Planning 4D.",
    status: "active",
    createdAt: new Date("2026-05-28"),
    updatedAt: new Date("2026-05-28"),
  },
  {
    id: "project-004",
    name: "Biblioteca BIM",
    client: "Arquitetura Sigma",
    description:
      "Organização e categorização dos artigos técnicos da biblioteca.",
    status: "inactive",
    createdAt: new Date("2026-04-11"),
    updatedAt: new Date("2026-04-11"),
  },
  {
    id: "project-005",
    name: "Padronização de Atendimento",
    client: "Grupo Atlas",
    description:
      "Projeto focado em melhorias dos processos de suporte e base de conhecimento.",
    status: "archived",
    createdAt: new Date("2026-03-22"),
    updatedAt: new Date("2026-03-22"),
  },
];