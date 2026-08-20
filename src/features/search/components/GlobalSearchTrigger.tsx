"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

import { GlobalSearchDialog } from "./GlobalSearchDialog";

export function GlobalSearchTrigger() {
  const [open, setOpen] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl K");

  useEffect(() => {
    // Só o cliente conhece a plataforma: definir isto no render divergiria do servidor.
    if (/mac|iphone|ipad/i.test(navigator.userAgent)) setShortcutLabel("⌘ K");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setOpen((current) => !current);
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
    </>
  );
}
