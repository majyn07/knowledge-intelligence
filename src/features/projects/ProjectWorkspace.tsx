"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FolderKanban } from "lucide-react";

import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { PageHeader } from "@/components/common/page/PageHeader";
import { PageSection } from "@/components/common/page/PageSection";
import { Button } from "@/components/ui/button";
import { ActivityTimeline } from "@/features/activities/components/ActivityTimeline";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { useKnowledgeLifecycle } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { ticketService } from "@/features/analysis/services/ticketService";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { selectProjectMetrics } from "@/features/metrics/projectMetrics";
import { usePlans } from "@/features/plans/providers/PlansProvider";
import { useProject } from "@/providers/ProjectProvider";

import { ProjectAttention } from "./components/ProjectAttention";
import { ProjectDialog } from "./components/ProjectDialog";
import { ProjectForm } from "./components/ProjectForm";
import { ProjectIdentity } from "./components/ProjectIdentity";
import { ProjectModuleLinks } from "./components/ProjectModuleLinks";
import { ProjectOperationalSummary } from "./components/ProjectOperationalSummary";
import { projectService } from "./services/ProjectService";
import type { ProjectFormData } from "./types/ProjectFormData";

interface ProjectWorkspaceProps {
  projectId: string;
}

export function ProjectWorkspace({ projectId }: ProjectWorkspaceProps) {
  const { projects, activeProjectId, isHydrated, selectProject, updateProject } = useProject();
  const { events } = useActivity();
  const { analyses } = useKnowledgeLifecycle();
  const { plans } = usePlans();
  const { items: articles } = useLibrary();
  const [isEditing, setIsEditing] = useState(false);

  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    return (
      <div className="w-full space-y-7">
        <Button variant="ghost" size="sm" render={<Link href="/projects" />} nativeButton={false}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Todos os projetos
        </Button>

        <BrandEmptyState
          title={isHydrated ? "Projeto não encontrado" : "Carregando projeto"}
          description={
            isHydrated
              ? "Este projeto pode ter sido excluído. Volte para a lista e selecione outro."
              : "Recuperando os projetos guardados neste navegador."
          }
        />
      </div>
    );
  }

  const isActive = project.id === activeProjectId;
  const projectEvents = events.filter((event) => event.projectId === project.id).slice(0, 5);
  const metrics = selectProjectMetrics({
    projectId: project.id,
    analyses,
    plans,
    articles,
    tickets: ticketService.getTickets(project.id),
  });

  // Abrir um módulo a partir daqui garante que ele mostre este projeto, e não outro.
  function activateProject() {
    if (!isActive) selectProject(project!.id);
  }

  function handleSubmit(data: ProjectFormData) {
    updateProject(project!.id, data);
    setIsEditing(false);
  }

  return (
    <div className="w-full space-y-8">
      <Button variant="ghost" size="sm" render={<Link href="/projects" />} nativeButton={false}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Todos os projetos
      </Button>

      <PageHeader
        overline="Workspace do projeto"
        title={project.name}
        description="Contexto, estado atual e os módulos onde o trabalho deste projeto acontece."
        icon={<FolderKanban className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap gap-2">
            {isActive ? (
              <Button variant="outline" disabled>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Projeto ativo
              </Button>
            ) : (
              <Button variant="outline" onClick={activateProject}>
                Tornar projeto ativo
              </Button>
            )}

            <Button onClick={() => setIsEditing(true)}>Editar projeto</Button>
          </div>
        }
      />

      <ProjectIdentity project={project} isActive={isActive} />

      <ProjectOperationalSummary metrics={metrics} />

      <ProjectAttention metrics={metrics} onNavigate={activateProject} />

      <ProjectModuleLinks metrics={metrics} onNavigate={activateProject} />

      <PageSection title="Atividade recente" description="Os últimos fatos registrados neste projeto." actions={projectEvents.length > 0 ? <Button size="sm" variant="outline" render={<Link href="/activities" />} nativeButton={false} onClick={activateProject}>Ver histórico completo</Button> : undefined}>
        {projectEvents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">Nada aconteceu neste projeto ainda.</p>
        ) : (
          <ActivityTimeline events={projectEvents} />
        )}
      </PageSection>

      <ProjectDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        title="Editar projeto"
        description="Atualize a identidade, o contexto AltoQi e o objetivo deste projeto."
      >
        <ProjectForm
          initialData={projectService.toFormData(project)}
          submitLabel="Atualizar"
          onSubmit={handleSubmit}
          onCancel={() => setIsEditing(false)}
        />
      </ProjectDialog>
    </div>
  );
}
