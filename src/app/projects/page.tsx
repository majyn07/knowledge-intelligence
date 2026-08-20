"use client";

import type { ProjectFormData } from "@/features/projects/types/ProjectFormData";

import { Button } from "@/components/ui/button";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/page/PageHeader";

import { ProjectDeleteDialog } from "@/features/projects/components/ProjectDeleteDialog";
import { ProjectDialog } from "@/features/projects/components/ProjectDialog";
import { ProjectForm } from "@/features/projects/components/ProjectForm";
import { ProjectGrid } from "@/features/projects/components/ProjectGrid";
import { ProjectToolbar } from "@/features/projects/components/ProjectToolbar";

import { useProjectFilters } from "@/features/projects/hooks/useProjectFilters";
import { useProjectDialogs } from "@/features/projects/hooks/useProjectDialogs";
import { projectService } from "@/features/projects/services/ProjectService";
import { useProject } from "@/providers/ProjectProvider";

export default function ProjectsPage() {
  const {
    projects,
    activeProjectId,
    createProject,
    updateProject,
    deleteProject,
  } = useProject();

  const {
    filters,
    setFilters,
    filteredProjects,
  } = useProjectFilters(projects);

  const {
    dialogOpen,
    deleteDialogOpen,
    selectedProject,
    setDialogOpen,
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeDialog,
    closeDeleteDialog,
  } = useProjectDialogs();

  function handleSubmit(data: ProjectFormData) {
    if (selectedProject) {
      updateProject(selectedProject.id, data);
    } else {
      createProject(data);
    }

    closeDialog();
  }

  function handleConfirmDelete() {
    if (!selectedProject) {
      return;
    }

    deleteProject(selectedProject.id);

    closeDeleteDialog();
  }

  return (
    <AppShell>
      <div className="w-full space-y-9">
        <PageHeader
          overline="Workspace"
          title="Projetos"
          description="Cada projeto é uma unidade de contexto: atendimentos, análises, planos e conhecimento pertencem a ele."
          actions={
            <Button onClick={openCreateDialog}>
              Novo Projeto
            </Button>
          }
        />

        <ProjectToolbar
          filters={filters}
          onFiltersChange={setFilters}
          onNewProject={openCreateDialog}
        />

        <ProjectGrid
          projects={filteredProjects}
          activeProjectId={activeProjectId}
          onProjectEdit={openEditDialog}
          onProjectDelete={openDeleteDialog}
        />

        <ProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={
            selectedProject
              ? "Editar Projeto"
              : "Novo Projeto"
          }
          description={
            selectedProject
              ? "Atualize as informações do projeto."
              : "Defina a identidade, o contexto AltoQi e o objetivo do projeto."
          }
        >
          <ProjectForm
            key={selectedProject?.id ?? "novo"}
            initialData={
              selectedProject
                ? projectService.toFormData(selectedProject)
                : undefined
            }
            submitLabel={
              selectedProject
                ? "Atualizar"
                : "Salvar"
            }
            onSubmit={handleSubmit}
            onCancel={closeDialog}
          />
        </ProjectDialog>

        <ProjectDeleteDialog
          open={deleteDialogOpen}
          projectName={selectedProject?.name ?? ""}
          onCancel={closeDeleteDialog}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </AppShell>
  );
}
