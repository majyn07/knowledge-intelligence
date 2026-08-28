"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

import { GlobalSearchDialog } from "./GlobalSearchDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";

/**
 * Um atalho de tecla só não pode disparar enquanto a pessoa escreve.
 *
 * "/" e "?" são caracteres comuns em português. Sem esta guarda, digitar
 * "e/ou" numa descrição abriria a paleta no meio da frase.
 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export function GlobalSearchTrigger() {
  const [open, setOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl K");

  useEffect(() => {
    // Só o cliente conhece a plataforma: definir isto no render divergiria do servidor.
    if (/mac|iphone|ipad/i.test(navigator.userAgent)) setShortcutLabel("⌘ K");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }

      if (isTyping(event.target)) return;

      // Convenção de mercado, e não invenção nossa: quem já usa outras
      // ferramentas tenta estas duas sem precisar aprender.
      if (event.key === "/") {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setShortcuts(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground"
        aria-label="Buscar em todo o workspace"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Buscar</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] md:inline">
          {shortcutLabel}
        </kbd>
      </Button>

      <GlobalSearchDialog open={open} onOpenChange={setOpen} />

      <ShortcutsDialog open={shortcuts} onOpenChange={setShortcuts} />
    </>
  );
}
