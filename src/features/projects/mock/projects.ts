export interface Project {
  id: string;
  name: string;
  client: string;
  description: string;
  createdAt: string;
  status: "active" | "archived";
}

export const projects: Project[] = [
  {
    id: "project-001",
    name: "Melhoria da Base de Conhecimento",
    client: "Alpha Engenharia",
    description:
      "Projeto destinado à análise dos atendimentos e evolução da Base de Conhecimento.",
    createdAt: "15/07/2026",
    status: "active",
  },
];