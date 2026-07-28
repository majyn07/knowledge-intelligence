"use client";

import { FormEvent, useEffect, useState } from "react";

import type { ProjectFormData } from "@/features/projects/types/ProjectFormData";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectFormProps {
  initialData?: ProjectFormData;
  submitLabel?: string;
  onSubmit: (data: ProjectFormData) => void;
  onCancel?: () => void;
}

const emptyForm: ProjectFormData = {
  name: "",
  description: "",
};

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
    field: keyof ProjectFormData,
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
          placeholder="Ex.: Edifício Comercial Alpha"
          onChange={(event) =>
            handleChange(
              "name",
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