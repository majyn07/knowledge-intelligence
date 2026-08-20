import Link from "next/link";
import { Compass } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex min-h-96 w-full items-center justify-center">
        <div className="max-w-md text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Compass className="h-6 w-6" />
          </span>

          <h1 className="mt-5 text-xl font-semibold tracking-tight">
            Esta página não existe
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            O endereço pode ter mudado, ou o registro que você procurava foi
            excluído. A busca do workspace alcança tudo que existe hoje.
          </p>

          <Button className="mt-6" render={<Link href="/" />} nativeButton={false}>
            Voltar ao início
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
