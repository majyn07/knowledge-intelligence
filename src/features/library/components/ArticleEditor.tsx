"use client";

import { useState } from "react";

import type { Article } from "@/models/Article";

interface ArticleEditorProps {
  article: Article;
  onSave: (article: Article) => void;
  onCancel: () => void;
}

export function ArticleEditor({
  article,
  onSave,
  onCancel,
}: ArticleEditorProps) {
  const [form, setForm] = useState(article);

  function updateField<K extends keyof Article>(
    field: K,
    value: Article[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <div className="mt-6 rounded-xl border p-6">
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Título
          </label>

          <input
            value={form.title}
            onChange={(e) =>
              updateField("title", e.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            URL
          </label>

          <input
            value={form.sourceUrl}
            onChange={(e) =>
              updateField(
                "sourceUrl",
                e.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Tags
          </label>

          <input
            value={form.tags.join(", ")}
            onChange={(e) =>
              updateField(
                "tags",
                e.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Conteúdo
          </label>

          <textarea
            rows={12}
            value={form.content}
            onChange={(e) =>
              updateField(
                "content",
                e.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-2"
          >
            Cancelar
          </button>

          <button
            onClick={() => onSave(form)}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}