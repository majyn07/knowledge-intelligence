"use client";

import { Boxes, Paintbrush } from "lucide-react";

import { ProductGraphic } from "@/components/brand/ProductGraphic";
import { AppShell } from "@/components/layout/AppShell";
import { BrandThemeSwitcher } from "@/components/common/BrandThemeSwitcher";
import { PageHeader } from "@/components/common/page/PageHeader";
import { PageSection } from "@/components/common/page/PageSection";
import { PeopleManager } from "@/features/people/components/PeopleManager";
import { brandThemes, useBrandTheme } from "@/providers/BrandThemeProvider";

export default function SettingsPage() {
  const { theme } = useBrandTheme();
  const brand = brandThemes[theme];

  return (
    <AppShell>
      <div className="w-full space-y-8">
        <PageHeader
          overline="AltoQi"
          title="Configurações"
          description="Produto ativo no workspace e quem conduz o trabalho."
          icon={<Paintbrush className="h-6 w-6" />}
        />

        <PeopleManager />

        <PageSection title="Produto ativo" description="Define a identidade visual do workspace.">
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-6">
            <ProductGraphic
              product={theme}
              className="absolute -right-5 -bottom-8 h-36 w-52 text-primary opacity-15"
            />

            <div className="relative flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
                <Boxes className="h-6 w-6 text-primary" />
              </span>
              <p className="font-semibold">{brand.name}</p>
            </div>

            <div className="relative mt-5">
              <BrandThemeSwitcher />
            </div>
          </div>
        </PageSection>
      </div>
    </AppShell>
  );
}
