"use client";

import { ProductGraphic } from "./ProductGraphic";
import { useBrandTheme } from "@/providers/BrandThemeProvider";

export function BrandEmptyState({ title, description }: { title: string; description: string }) {
  const { theme } = useBrandTheme();
  return <div className="brand-empty-state"><ProductGraphic product={theme} className="mx-auto h-24 w-36 text-primary" /><h2>{title}</h2><p>{description}</p></div>;
}
