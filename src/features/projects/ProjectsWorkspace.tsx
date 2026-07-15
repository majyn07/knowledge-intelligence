import { projects } from "./mock/projects";

export function ProjectsWorkspace() {
  return (
    <div className="space-y-6">

      <div>

        <h1 className="text-3xl font-semibold">
          Projetos
        </h1>

        <p className="mt-2 text-muted-foreground">
          Gerencie os projetos de evolução da Base de Conhecimento.
        </p>

      </div>

      <div className="grid gap-4">

        {projects.map((project) => (

          <div
            key={project.id}
            className="rounded-xl border bg-card p-6"
          >

            <div className="flex items-start justify-between">

              <div>

                <h2 className="text-xl font-semibold">
                  {project.name}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {project.client}
                </p>

              </div>

              <span className="rounded-md border px-3 py-1 text-xs">
                {project.status === "active"
                  ? "Em andamento"
                  : "Arquivado"}
              </span>

            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              {project.description}
            </p>

            <div className="mt-6 border-t pt-4 text-sm">

              <p>
                <strong>Criado em:</strong> {project.createdAt}
              </p>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}