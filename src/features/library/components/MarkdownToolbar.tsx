"use client";

import type { RefObject } from "react";
import { Bold, Code, Heading2, Heading3, Link2, List, ListOrdered, Table } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface Action {
  icon: typeof Bold;
  label: string;
  /** Texto inserido; `$1` marca onde a seleção deve ficar. */
  apply: (selection: string) => string;
}

const actions: Action[] = [
  { icon: Heading2, label: "Título", apply: (s) => `## ${s || "Título"}` },
  { icon: Heading3, label: "Subtítulo", apply: (s) => `### ${s || "Subtítulo"}` },
  { icon: Bold, label: "Negrito", apply: (s) => `**${s || "texto"}**` },
  { icon: List, label: "Lista", apply: (s) => (s || "Item").split("\n").map((line) => `- ${line}`).join("\n") },
  { icon: ListOrdered, label: "Lista numerada", apply: (s) => (s || "Passo").split("\n").map((line, index) => `${index + 1}. ${line}`).join("\n") },
  { icon: Code, label: "Bloco de código", apply: (s) => `\`\`\`\n${s || "código"}\n\`\`\`` },
  { icon: Link2, label: "Link", apply: (s) => `[${s || "texto"}](https://)` },
  { icon: Table, label: "Tabela", apply: () => "| Coluna | Coluna |\n| --- | --- |\n| Valor | Valor |" },
];

export function MarkdownToolbar({ textareaRef, value, onChange, disabled }: MarkdownToolbarProps) {
  function insert(action: Action) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = value.slice(start, end);
    const snippet = action.apply(selection);

    // Blocos precisam começar em linha própria para o Markdown reconhecê-los.
    const needsBreakBefore = start > 0 && value[start - 1] !== "\n";
    const prefix = needsBreakBefore ? "\n" : "";

    onChange(`${value.slice(0, start)}${prefix}${snippet}${value.slice(end)}`);

    requestAnimationFrame(() => {
      const caret = start + prefix.length + snippet.length;
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-0.5 rounded-lg border border-border/70 bg-muted/25 p-1">
        {actions.map((action) => (
          <Tooltip key={action.label}>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={disabled}
                  aria-label={action.label}
                  onClick={() => insert(action)}
                >
                  <action.icon className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <TooltipContent side="bottom">{action.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
