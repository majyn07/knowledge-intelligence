import { ReactNode } from "react";

interface PageHeaderProps {
  overline?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({
  overline,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <section className="flex items-start justify-between gap-6">
      <div>
        {overline && (
          <p className="text-sm text-muted-foreground">
            {overline}
          </p>
        )}

        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </section>
  );
}