"use client";

import { useState } from "react";

import type { Project } from "@/models/Project";
import type { ProjectFormData } from "@/features/projects/types/ProjectFormData";

import { Button } from "@/components/ui/button";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/page/PageHeader";

import { PlansProvider } from "@/features/plans/providers/PlansProvider";

import { ProjectDeleteDialog } from "@/features/projects/components/ProjectDeleteDialog";
import { ProjectDialog } from "@/features/projects/components/ProjectDialog";
import { ProjectForm } from "@/features/projects/components/ProjectForm";
import { ProjectGrid } from "@/features/projects/components/ProjectGrid";
import { ProjectToolbar } from "@/features/projects/components/ProjectToolbar";

import { useProjectFilters } from "@/features/projects/hooks/useProjectFilters";
import { useProjects } from "@/features/projects/hooks/useProjects";

export default function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);

  const {
    projects,
    createProject,
    updateProject,
    deleteProject,
  } = useProjects();

  const {
    filters,
    setFilters,
    filteredProjects,
  } = useProjectFilters(projects);

  function handleNewProject() {
    setSelectedProject(null);
    setDialogOpen(true);
  }

  function handleProjectClick(project: Project) {
    setSelectedProject(project);
    setDialogOpen(true);
  }

  function handleProjectDelete(project: Project) {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  }

  function handleSubmit(data: ProjectFormData) {
    if (selectedProject) {
      updateProject(selectedProject.id, data);
    } else {
      createProject(data);
    }

    handleCloseDialog();
  }

  function handleConfirmDelete() {
    if (!selectedProject) {
      return;
    }

    deleteProject(selectedProject.id);

    handleCloseDeleteDialog();
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setSelectedProject(null);
  }

  function handleCloseDeleteDialog() {
    setDeleteDialogOpen(false);
    setSelectedProject(null);
  }

  return (
    <PlansProvider>
      <AppShell>
        <div className="space-y-8">
          <PageHeader
            overline="Workspace"
            title="Projetos"
            description="Gerencie todos os projetos cadastrados na plataforma."
            actions={
              <Button onClick={handleNewProject}>
                Novo Projeto
              </Button>
            }
          />

          <ProjectToolbar
            filters={filters}
            onFiltersChange={setFilters}
            onNewProject={handleNewProject}
          />

          <ProjectGrid
            projects={filteredProjects}
            onProjectClick={handleProjectClick}
            onProjectEdit={handleProjectClick}
            onProjectDelete={handleProjectDelete}
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
                      description:
                        selectedProject.description,
                    }
                  : undefined
              }
              submitLabel={
                selectedProject
                  ? "Atualizar"
                  : "Salvar"
              }
              onSubmit={handleSubmit}
              onCancel={handleCloseDialog}
            />
          </ProjectDialog>

          <ProjectDeleteDialog
            open={deleteDialogOpen}
            projectName={selectedProject?.name ?? ""}
            onCancel={handleCloseDeleteDialog}
            onConfirm={handleConfirmDelete}
          />
        </div>
      </AppShell>
    </PlansProvider>
  );
}