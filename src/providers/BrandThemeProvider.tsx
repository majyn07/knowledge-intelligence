"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type BrandTheme = "visus" | "builder" | "eberick";

export const brandThemes: Record<BrandTheme, { name: string }> = {
  visus: { name: "Visus" },
  builder: { name: "Builder" },
  eberick: { name: "Eberick" },
};

const BrandThemeContext = createContext<{ theme: BrandTheme; setTheme: (theme: BrandTheme) => void } | null>(null);
import { readRaw, writeRaw } from "@/lib/storage";

const STORAGE_KEY = "visus-brand-theme";

export function BrandThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<BrandTheme>("visus");

  useEffect(() => {
    const stored = readRaw(STORAGE_KEY) as BrandTheme | null;
    if (stored && stored in brandThemes) setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.brand = theme;
    writeRaw(STORAGE_KEY, theme);
  }, [theme]);

  return <BrandThemeContext.Provider value={{ theme, setTheme }}>{children}</BrandThemeContext.Provider>;
}

export function useBrandTheme() {
  const context = useContext(BrandThemeContext);
  if (!context) throw new Error("useBrandTheme must be used within BrandThemeProvider.");
  return context;
}
