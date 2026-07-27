"use client";

import { FormEvent, useEffect, useState } from "react";

import type { LibraryFormData } from "@/features/library/types/LibraryFormData";

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
import { Textarea } from "@/components/ui/textarea";

interface LibraryFormProps {
  projects: {
    id: string;
    name: string;
  }[];

  initialData?: LibraryFormData;
  submitLabel?: string;
  onSubmit: (data: LibraryFormData) => void;
  onCancel?: () => void;
}

const emptyForm: LibraryFormData = {
  title: "",
  description: "",
  projectId: "",
  type: "article",
  status: "draft",
  category: "",
  tags: [],
};

export function LibraryForm({
  projects,
  initialData,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
}: LibraryFormProps) {
  const [formData, setFormData] =
    useState<LibraryFormData>(
      initialData ?? emptyForm
    );

  const [tags, setTags] = useState("");

  useEffect(() => {
    setFormData(initialData ?? emptyForm);

    setTags(
      initialData?.tags.join(", ") ?? ""
    );
  }, [initialData]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    onSubmit({
      ...formData,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    setFormData(emptyForm);
    setTags("");
  }

  function handleChange<K extends keyof LibraryFormData>(
    field: K,
    value: LibraryFormData[K]
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
        <Label htmlFor="title">
          Título
        </Label>

        <Input
          id="title"
          placeholder="Ex.: Como configurar Workflow"
          value={formData.title}
          onChange={(event) =>
            handleChange(
              "title",
              event.target.value
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Descrição
        </Label>

        <Textarea
          id="description"
          placeholder="Descreva o conteúdo..."
          value={formData.description}
          onChange={(event) =>
            handleChange(
              "description",
              event.target.value
            )
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Projeto</Label>

          <Select
            value={formData.projectId}
            onValueChange={(value) =>
              handleChange(
                "projectId",
                value ?? ""
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um projeto" />
            </SelectTrigger>

            <SelectContent>
              {projects.map((project) => (
                <SelectItem
                  key={project.id}
                  value={project.id}
                >
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>

          <Select
            value={formData.type}
            onValueChange={(value) =>
              handleChange(
                "type",
                (value ??
                  "article") as LibraryFormData["type"]
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="article">
                Artigo
              </SelectItem>

              <SelectItem value="faq">
                FAQ
              </SelectItem>

              <SelectItem value="workflow">
                Workflow
              </SelectItem>

              <SelectItem value="document">
                Documento
              </SelectItem>

              <SelectItem value="template">
                Template
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>

          <Select
            value={formData.status}
            onValueChange={(value) =>
              handleChange(
                "status",
                (value ??
                  "draft") as LibraryFormData["status"]
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="draft">
                Rascunho
              </SelectItem>

              <SelectItem value="review">
                Em revisão
              </SelectItem>

              <SelectItem value="published">
                Publicado
              </SelectItem>

              <SelectItem value="archived">
                Arquivado
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">
          Categoria
        </Label>

        <Input
          id="category"
          placeholder="Workflow"
          value={formData.category}
          onChange={(event) =>
            handleChange(
              "category",
              event.target.value
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">
          Tags
        </Label>

        <Input
          id="tags"
          placeholder="workflow, kb, planejamento"
          value={tags}
          onChange={(event) =>
            setTags(event.target.value)
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
          disabled={
            !formData.title.trim() ||
            !formData.projectId
          }
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}