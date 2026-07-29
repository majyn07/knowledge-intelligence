"use client";

import { Boxes, Grid3X3, Paintbrush } from "lucide-react";
import { ProductGraphic } from "@/components/brand/ProductGraphic";
import { AppShell } from "@/components/layout/AppShell";
import { BrandThemeSwitcher } from "@/components/common/BrandThemeSwitcher";
import { PageHeader } from "@/components/common/page/PageHeader";
import { PageSection } from "@/components/common/page/PageSection";
import { brandThemes, useBrandTheme } from "@/providers/BrandThemeProvider";

export default function SettingsPage() {
  const { theme } = useBrandTheme();
  const brand = brandThemes[theme];
  return <AppShell><div className="space-y-8"><PageHeader overline="AltoQi" title="Produto" description="Selecione o produto ativo no workspace." icon={<Paintbrush className="h-6 w-6" />} /><PageSection title="Produto ativo"><div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-6"><ProductGraphic product={theme} className="absolute -right-5 -bottom-8 h-36 w-52 text-primary opacity-15" /><div className="relative flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/5"><Boxes className="h-6 w-6 text-primary" /></span><p className="font-semibold">{brand.name}</p></div></div><div className="mt-5"><BrandThemeSwitcher /></div></PageSection><PageSection title="Sistema visual"><div className="grid gap-4 md:grid-cols-3">{[[Grid3X3, "Malha técnica"], [Boxes, "Módulos"], [Paintbrush, "Composição"]].map(([Icon, title]) => { const FeatureIcon = Icon as typeof Grid3X3; return <article key={title as string} className="brand-feature-card"><FeatureIcon className="h-5 w-5 text-primary" /><h2>{title as string}</h2></article>; })}</div></PageSection></div></AppShell>;
}
