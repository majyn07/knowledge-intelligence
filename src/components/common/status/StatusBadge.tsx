import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface StatusBadgeProps {
  children: ReactNode;
  variant?: StatusVariant;
}

const variants: Record<StatusVariant, string> = {
  default:
    "border-border bg-muted text-foreground hover:bg-muted",

  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",

  warning:
    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",

  danger:
    "border-red-200 bg-red-50 text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-red-950 dark:text-red-300",

  info:
    "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
};

export function StatusBadge({
  children,
  variant = "default",
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        variants[variant]
      )}
    >
      {children}
    </Badge>
  );
}