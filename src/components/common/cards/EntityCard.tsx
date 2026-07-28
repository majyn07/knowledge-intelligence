import { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface EntityCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function EntityCard({
  title,
  description,
  icon,
  actions,
  footer,
  children,
}: EntityCardProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
      <CardHeader className="gap-5 border-b border-border/50 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4">
            {icon && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary">
                {icon}
              </div>
            )}

            <div className="min-w-0">
              <CardTitle className="truncate text-lg font-semibold tracking-tight">
                {title}
              </CardTitle>

              {description && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex shrink-0 items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {children}

        {footer && (
          <div className="-mx-6 -mb-6 mt-8 border-t border-border/50 bg-muted/20 px-6 py-5">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}