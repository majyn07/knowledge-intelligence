"use client";

import { Boxes, Grid3X3, Paintbrush } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { BrandThemeSwitcher } from "@/components/common/BrandThemeSwitcher";
import { PageHeader } from "@/components/common/page/PageHeader";
import { PageSection } from "@/components/common/page/PageSection";
import { brandThemes, useBrandTheme } from "@/providers/BrandThemeProvider";

export default function SettingsPage() {
  const { theme } = useBrandTheme();
  const brand = brandThemes[theme];
  const features = [
    [Grid3X3, "Malha técnica", "Organiza as superfícies e reforça a precisão."],
    [Boxes, "Geometria modular", "Ícones e estruturas sugerem componentes BIM."],
    [Paintbrush, "Cor por solução", "O tema identifica o produto sem mudar a experiência."],
  ] as const;

  return <AppShell><div className="space-y-8"><PageHeader overline="Sistema" title="Identidade do produto" description="A mesma linguagem técnica AltoQi, adaptada para cada solução." icon={<Paintbrush className="h-6 w-6" />} /><PageSection title="Tema ativo" description="A escolha é salva neste navegador e aplicada em toda a interface."><div className="flex flex-col gap-6 rounded-2xl border border-border/70 bg-card/85 p-6 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-primary"><Boxes className="h-5 w-5" /><span className="font-semibold">{brand.name}</span></div><p className="mt-2 text-sm text-muted-foreground">{brand.description}</p></div><BrandThemeSwitcher /></div></PageSection><PageSection title="Linguagem visual" description="Elementos que permanecem consistentes entre as soluções."><div className="grid gap-4 md:grid-cols-3">{features.map(([Icon, title, description]) => <article key={title} className="rounded-xl border border-border/70 bg-muted/20 p-5"><Icon className="h-5 w-5 text-primary" /><h2 className="mt-5 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></article>)}</div></PageSection></div></AppShell>;
}
