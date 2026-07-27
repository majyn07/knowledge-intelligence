import type { Library } from "@/models/Library";

export const library: Library[] = [
  {
    id: "library-001",
    title: "Como criar um Workflow",
    description:
      "Guia para criação e configuração de workflows no Visus.",
    projectId: "project-001",
    type: "article",
    status: "published",
    category: "Workflow",
    tags: ["workflow", "configuração"],
    createdAt: new Date("2026-07-15"),
    updatedAt: new Date("2026-07-15"),
  },
  {
    id: "library-002",
    title: "Fluxo de aprovação de artigos",
    description:
      "Documentação do processo de revisão e publicação da base de conhecimento.",
    projectId: "project-001",
    type: "workflow",
    status: "review",
    category: "Processos",
    tags: ["aprovação", "kb"],
    createdAt: new Date("2026-07-10"),
    updatedAt: new Date("2026-07-12"),
  },
  {
    id: "library-003",
    title: "FAQ - Planning 4D",
    description:
      "Perguntas frequentes relacionadas ao módulo Planning 4D.",
    projectId: "project-003",
    type: "faq",
    status: "published",
    category: "Planning 4D",
    tags: ["faq", "planning"],
    createdAt: new Date("2026-06-20"),
    updatedAt: new Date("2026-06-21"),
  },
  {
    id: "library-004",
    title: "Template de artigo técnico",
    description:
      "Modelo padrão para criação de novos artigos da base.",
    projectId: "project-004",
    type: "template",
    status: "draft",
    category: "Templates",
    tags: ["template"],
    createdAt: new Date("2026-05-30"),
    updatedAt: new Date("2026-05-30"),
  },
];