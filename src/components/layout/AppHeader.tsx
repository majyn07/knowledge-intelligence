"use client";

import { Bell, Search, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AppHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">

      <div className="flex items-center gap-4">

        <div>
          <h1 className="text-xl font-semibold">
            Workspace
          </h1>

          <p className="text-sm text-muted-foreground">
            Visus Knowledge Intelligence
          </p>
        </div>

      </div>

      <div className="flex items-center gap-3">

        <div className="relative hidden w-80 lg:block">

          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder="Pesquisar..."
            className="pl-9"
          />

        </div>

        <Button
          variant="ghost"
          size="icon"
        >
          <Bell className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
        >
          <Settings className="h-5 w-5" />
        </Button>

      </div>

    </header>
  );
}