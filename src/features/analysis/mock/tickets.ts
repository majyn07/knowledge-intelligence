import type { Ticket } from "@/models/Ticket";

/*
  A data é o dia do atendimento, em `aaaa-mm-dd`. Era `dd/mm/aaaa` — formato
  de exibição num campo que deveria guardar dado —, e o normalizador continua
  convertendo o que já está gravado assim.
*/

export const tickets: Ticket[] = [
  {
    id: "45812",
    projectId: "project-001",
    title: "Erro ao autenticar após atualização",
    solution: "Workflow",
    company: "Alpha Engenharia",
    date: "2026-07-15",
  },
  {
    id: "45813",
    projectId: "project-001",
    title: "Permissões de acesso",
    solution: "Collab",
    company: "",
    date: "2026-07-14",
  },
  {
    id: "45814",
    projectId: "project-001",
    title: "Falha na instalação",
    solution: "Planning",
    company: "Beta Construtora",
    date: "2026-07-13",
  },
];