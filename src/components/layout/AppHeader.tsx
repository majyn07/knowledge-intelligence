"use client";

import { ReactNode } from "react";

import { BrandThemeSwitcher } from "@/components/common/BrandThemeSwitcher";
import { GlobalSearchTrigger } from "@/features/search/components/GlobalSearchTrigger";
import { ActingAsSelect } from "@/features/people/components/ActingAsSelect";

import { SidebarTrigger } from "@/components/ui/sidebar";

interface AppHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function AppHeader({
  title,
  description,
  actions,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-4 px-5 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />

          <div>
            <h1 className="text-sm font-semibold tracking-tight">
              {title}
            </h1>

            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:block"><ActingAsSelect /></div>
          <GlobalSearchTrigger />
          {actions}
          <div className="hidden md:block"><BrandThemeSwitcher compact /></div>
        </div>
      </div>
    </header>
  );
}
