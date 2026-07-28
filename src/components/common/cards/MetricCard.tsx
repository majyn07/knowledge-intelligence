import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  description?: ReactNode;
}

export function MetricCard({
  label,
  value,
  description,
}: MetricCardProps) {
  return (
    <Card className="rounded-xl border-border/70 bg-card shadow-none">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <div className="mt-3 text-2xl font-semibold tracking-tight">
          {value}
        </div>

        {description && (
          <div className="mt-2 text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
