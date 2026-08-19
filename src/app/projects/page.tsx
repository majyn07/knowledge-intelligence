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
import { useProject } from "@/providers/ProjectProvider";

export default function ProjectsPage() {
  const {
    projects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
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
        <div className="space-y-9">
          <PageHeader
            overline="Workspace"
            title="Projetos"
            description="Gerencie todos os projetos cadastrados na plataforma."
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
            onProjectClick={(project) => selectProject(project.id)}
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
                : "Preencha as informações para cadastrar um novo projeto."
            }
          >
            <ProjectForm
              initialData={
                selectedProject
                  ? {
                      name: selectedProject.name,
                      client: selectedProject.client,
                      description:
                        selectedProject.description,
                      status: selectedProject.status,
                    }
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
