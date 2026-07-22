"use client";

import { ReactNode } from "react";
import { Bell, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {title}
          </h1>

          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden w-96 lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder="Pesquisar artigos, tickets, projetos..."
            className="pl-9"
          />
        </div>

        {actions}

        <Button
          variant="ghost"
          size="icon"
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}