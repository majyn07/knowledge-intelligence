"use client";

import { useRef, useState, type ReactNode } from "react";
import { Eye, PenLine } from "lucide-react";

import { MarkdownContent } from "@/components/common/MarkdownContent";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { MarkdownToolbar } from "./MarkdownToolbar";

interface MarkdownFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
  /** Ações extras no cabeçalho, à esquerda do botão de pré-visualizar. */
  actions?: ReactNode;
}

/** Campo de texto longo em Markdown: barra de formatação e pré-visualização. */
export function MarkdownField({
  id,
  label,
  value,
  onChange,
  rows = 8,
  placeholder,
  hint,
  actions,
}: MarkdownFieldProps) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>

        <div className="flex gap-1">
          {actions}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setIsPreviewing((current) => !current)}
          >
            {isPreviewing ? (
              <>
                <PenLine className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Pré-visualizar
              </>
            )}
          </Button>
        </div>
      </div>

      {isPreviewing ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 p-5" style={{ minHeight: `${rows * 1.6}rem` }}>
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Nada escrito ainda.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <MarkdownToolbar textareaRef={textareaRef} value={value} onChange={onChange} />

          <Textarea
            id={id}
            ref={textareaRef}
            rows={rows}
            className="font-mono text-sm"
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
