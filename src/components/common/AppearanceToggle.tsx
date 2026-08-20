"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppearance, type Appearance } from "@/providers/AppearanceProvider";
import { cn } from "@/lib/utils";

const options: { value: Appearance; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Escuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
];

/**
 * Escolha da aparência.
 *
 * Três estados e não dois: "sistema" é o padrão porque quem já configurou o
 * computador não deveria configurar de novo aqui — e continua acompanhando se
 * a preferência do sistema mudar durante o uso.
 */
export function AppearanceToggle({ compact = false }: { compact?: boolean }) {
  const { appearance, setAppearance } = useAppearance();

  return (
    <div
      role="radiogroup"
      aria-label="Aparência"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border p-0.5",
        compact && "border-dashed"
      )}
    >
      {options.map(({ value, label, Icon }) => {
        const selected = appearance === value;

        return (
          <Button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            size="sm"
            variant={selected ? "default" : "ghost"}
            className={cn("h-7 gap-1.5 px-2", compact && "px-1.5")}
            onClick={() => setAppearance(value)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {!compact && <span className="text-xs">{label}</span>}
          </Button>
        );
      })}
    </div>
  );
}
