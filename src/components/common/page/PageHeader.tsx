import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  overline?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function PageHeader({
  overline,
  title,
  description,
  actions,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-5">
        {icon && (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-primary/8 text-primary shadow-sm">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          {overline && (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
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
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}