import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Property {
  label: string;
  value: ReactNode;
}

interface PropertyGridProps {
  items: Property[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const gridColumns = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

export function PropertyGrid({
  items,
  columns = 2,
  className,
}: PropertyGridProps) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-5",
        gridColumns[columns],
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border/70 bg-muted/20 p-5 transition-all duration-200 hover:border-primary/20 hover:bg-background hover:shadow-sm"
        >
          <dt className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {item.label}
          </dt>

          <dd className="wrap-break-word text-[15px] font-medium leading-6 text-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}