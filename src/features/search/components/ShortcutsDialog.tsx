"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Atalhos que existem.
 *
 * A lista é curta porque é honesta: o produto tem três atalhos, e inventar
 * uma tabela cheia sugeriria uma agilidade que ele ainda não tem. Ela cresce
 * quando os atalhos crescerem.
 */
const shortcuts: { keys: string[]; description: string }[] = [
  { keys: ["Ctrl", "K"], description: "Abrir a paleta: ir para uma tela ou buscar um registro" },
  { keys: ["/"], description: "O mesmo, sem precisar do Ctrl" },
  { keys: ["?"], description: "Esta lista" },
  { keys: ["↑", "↓"], description: "Percorrer os resultados da paleta" },
  { keys: ["Enter"], description: "Abrir o resultado em destaque" },
  { keys: ["Esc"], description: "Fechar a paleta ou o diálogo aberto" },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Atalhos de teclado</DialogTitle>

        <ul className="mt-2 flex flex-col gap-2.5">
          {shortcuts.map((shortcut) => (
            <li
              key={shortcut.keys.join("+")}
              className="flex items-baseline justify-between gap-4"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>

              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
