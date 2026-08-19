"use client";

import { FormEvent, useEffect, useState } from "react";

import type { ProjectFormData } from "@/features/projects/types/ProjectFormData";
import { projectStatusLabel, type ProjectStatus } from "@/models/Project";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectFormProps {
  initialData?: ProjectFormData;
  submitLabel?: string;
  onSubmit: (data: ProjectFormData) => void;
  onCancel?: () => void;
}

const emptyForm: ProjectFormData = {
  name: "",
  client: "",
  description: "",
  status: "active",
};

const statusOptions: ProjectStatus[] = ["active", "inactive", "archived"];

export function ProjectForm({
  initialData,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const [formData, setFormData] =
    useState<ProjectFormData>(
      initialData ?? emptyForm
    );

  useEffect(() => {
    // Sincroniza o formulário quando o projeto em edição muda.
    setFormData(initialData ?? emptyForm);
  }, [initialData]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    onSubmit(formData);

    setFormData(emptyForm);
  }

  function handleChange(
    field: "name" | "client" | "description",
    value: string
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="name">
          Nome do projeto
        </Label>

        <Input
          id="name"
          value={formData.name}
          placeholder="Ex.: Base Visus Produção"
          onChange={(event) =>
            handleChange(
              "name",
              event.target.value
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client">
          Cliente
        </Label>

        <Input
          id="client"
          value={formData.client}
          placeholder="Ex.: AltoQi"
          onChange={(event) =>
            handleChange(
              "client",
              event.target.value
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Descrição
        </Label>

        <Input
          id="description"
          value={formData.description}
          placeholder="Descrição do projeto"
          onChange={(event) =>
            handleChange(
              "description",
              event.target.value
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">
          Status
        </Label>

        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData((previous) => ({
              ...previous,
              status: value as ProjectStatus,
            }))
          }
        >
          <SelectTrigger id="status">
            <SelectValue>
              {(status: ProjectStatus) => projectStatusLabel[status]}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {projectStatusLabel[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={!formData.name.trim()}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
