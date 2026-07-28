import { ReactNode } from "react";

interface PageToolbarProps {
  start?: ReactNode;
  end?: ReactNode;
}

export function PageToolbar({
  start,
  end,
}: PageToolbarProps) {
  if (!start && !end) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 border-y border-border/70 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {start}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {end}
      </div>
    </div>
  );
}
