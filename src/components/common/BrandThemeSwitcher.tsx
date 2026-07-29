"use client";

import { Boxes } from "lucide-react";
import { brandThemes, type BrandTheme, useBrandTheme } from "@/providers/BrandThemeProvider";
import { Button } from "@/components/ui/button";

export function BrandThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useBrandTheme();
  return <div className={compact ? "flex items-center gap-1" : "rounded-xl border border-border/70 bg-card/80 p-1.5 shadow-sm"} aria-label="Tema do produto">
    {!compact && <span className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground"><Boxes className="h-3.5 w-3.5 text-primary" />Produto</span>}
    {(Object.keys(brandThemes) as BrandTheme[]).map((item) => <Button key={item} size="sm" variant={theme === item ? "default" : "ghost"} onClick={() => setTheme(item)}>{brandThemes[item].name}</Button>)}
  </div>;
}
