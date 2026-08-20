import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/common/page/Breadcrumbs";
import { ProductAccent } from "@/components/brand/ProductAccent";

interface PageHeaderProps {
  overline?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  /**
   * Nome do registro aberto, para a trilha de navegação.
   *
   * Só as telas de detalhe passam: nas de listagem a trilha já se resolve
   * pelo caminho.
   */
  trailLeaf?: string;
}

export function PageHeader({
  overline,
  title,
  description,
  actions,
  icon,
  className,
  trailLeaf,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "brand-page-header flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between",
        className
      )}
    >
      <ProductAccent />
      <div className="relative z-10 flex min-w-0 items-start gap-5">
        {icon && (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-primary/8 text-primary shadow-sm">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          {/*
            A trilha vem antes do rótulo da seção: é a resposta para "onde eu
            estou", e ela precede a resposta para "o que é isto".
          */}
          <Breadcrumbs leaf={trailLeaf} />

          {overline && (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {overline}
            </p>
          )}

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>

          {description && (
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
