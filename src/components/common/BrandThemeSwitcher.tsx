"use client";

import { Check } from "lucide-react";
import { ProductGraphic } from "@/components/brand/ProductGraphic";
import { brandThemes, type BrandTheme, useBrandTheme } from "@/providers/BrandThemeProvider";
import { cn } from "@/lib/utils";

export function BrandThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useBrandTheme();
  const active = brandThemes[theme];
  if (compact) return <a href="/settings" className="product-identity-chip" aria-label="Alterar produto"><ProductGraphic product={theme} className="h-7 w-10 text-primary" /><span className="hidden text-xs font-semibold lg:inline">{active.name}</span></a>;
  return <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Produto">{(Object.keys(brandThemes) as BrandTheme[]).map((product) => { const item = brandThemes[product]; const selected = theme === product; return <button key={product} type="button" role="radio" aria-checked={selected} onClick={() => setTheme(product)} className={cn("product-choice", selected && "product-choice-active")}><ProductGraphic product={product} className="absolute -right-3 -bottom-5 h-28 w-36 text-primary opacity-25" /><span className="relative flex items-center justify-between"><strong>{item.name}</strong>{selected && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3.5 w-3.5" /></span>}</span></button>; })}</div>;
}
