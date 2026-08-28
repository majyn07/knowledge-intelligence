"use client";

import Image from "next/image";
import { Check } from "lucide-react";

import { ProductGraphic } from "@/components/brand/ProductGraphic";
import {
  brandThemes,
  type BrandTheme,
  useBrandTheme,
} from "@/providers/BrandThemeProvider";
import { cn } from "@/lib/utils";

/**
 * Marca de cada produto, do kit oficial. O arquivo já traz o nome do produto,
 * então o cartão não repete o rótulo em texto, repetir seria ruído.
 */
const productMark: Record<BrandTheme, string> = {
  visus: "/brand/produto-visus.png",
  builder: "/brand/produto-builder.png",
  eberick: "/brand/produto-eberick.png",
};

export function BrandThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useBrandTheme();

  if (compact) {
    const active = brandThemes[theme];

    return (
      <a
        href="/settings"
        className="product-identity-chip"
        aria-label={`Produto: ${active.name}. Alterar`}
      >
        <ProductGraphic product={theme} className="h-7 w-10 text-primary" />

        <span className="hidden text-xs font-semibold lg:inline">
          {active.name}
        </span>
      </a>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Produto">
      {(Object.keys(brandThemes) as BrandTheme[]).map((product) => {
        const item = brandThemes[product];
        const selected = theme === product;

        return (
          <button
            key={product}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(product)}
            className={cn("product-choice", selected && "product-choice-active")}
          >
            <span className="relative flex items-center justify-between gap-3">
              <Image
                src={productMark[product]}
                alt={item.name}
                width={240}
                height={108}
                className="h-9 w-auto"
              />

              {selected && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
