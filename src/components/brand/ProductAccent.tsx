"use client";

import { ProductGraphic } from "./ProductGraphic";
import { useBrandTheme } from "@/providers/BrandThemeProvider";

export function ProductAccent({ className = "" }: { className?: string }) {
  const { theme } = useBrandTheme();
  return <div aria-hidden className={`pointer-events-none absolute -right-4 -bottom-7 hidden h-32 w-52 text-primary opacity-[0.12] lg:block ${className}`}><ProductGraphic product={theme} className="h-full w-full" /></div>;
}
