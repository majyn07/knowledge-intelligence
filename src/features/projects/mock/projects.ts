import type { Project } from "@/models/Project";

export const projects: Project[] = [
  {
    id: "project-001",
    name: "Base Visus Produção",
    client: "AltoQi",
    description:
      "Projeto principal destinado à evolução da Base de Conhecimento do Visus.",
    status: "active",
    product: "AltoQi Visus",
    module: "Orçamento & IFC",
    goal: "Reduzir recorrência de chamados sobre importação IFC e estimativas de custos em 30%.",
    owner: "Suporte Visus",
    createdAt: new Date("2026-07-15"),
    updatedAt: new Date("2026-07-15"),
  },
  {
    id: "project-002",
    name: "Workflow Elétrico Builder",
    client: "Construtora Horizonte",
    description:
      "Padronização dos fluxos de atendimento e documentação técnica do módulo Elétrico do Builder.",
    status: "active",
    product: "AltoQi Builder",
    module: "Instalações Elétricas",
    goal: "Mapear principais dúvidas sobre dimensionamento de circuitos e quadros de carga.",
    owner: "Suporte Builder Elétrica",
    createdAt: new Date("2026-06-02"),
    updatedAt: new Date("2026-06-02"),
  },
  {
    id: "project-003",
    name: "Cálculo Estrutural Eberick",
    client: "Engenharia Beta",
    description:
      "Revisão da documentação e artigos relacionados ao módulo de análise estrutural do Eberick.",
    status: "active",
    product: "AltoQi Eberick",
    module: "Estruturas de Concreto",
    goal: "Eliminar gargalos documentais em verificações de estabilidade global (GAMA Z).",
    owner: "Engenharia de Estruturas",
    createdAt: new Date("2026-05-28"),
    updatedAt: new Date("2026-05-28"),
  },
  {
    id: "project-004",
    name: "Biblioteca BIM & Objetos",
    client: "Arquitetura Sigma",
    description:
      "Organização e categorização dos artigos técnicos da biblioteca de componentes BIM.",
    status: "inactive",
    product: "AltoQi Visus",
    module: "Biblioteca BIM",
    goal: "Padronizar catálogo de propriedades e parâmetros IFC.",
    owner: "Equipe BIM AltoQi",
    createdAt: new Date("2026-04-11"),
    updatedAt: new Date("2026-04-11"),
  },
  {
    id: "project-005",
    name: "Padronização de Atendimento SAC",
    client: "Grupo Atlas",
    description:
      "Projeto focado em melhorias dos processos de suporte e base de conhecimento geral.",
    status: "archived",
    product: "",
    module: "Gestão de Suporte",
    goal: "Consolidar base histórica de atendimentos migrados.",
    owner: "Gestão Operacional",
    createdAt: new Date("2026-03-22"),
    updatedAt: new Date("2026-03-22"),
  },
];
