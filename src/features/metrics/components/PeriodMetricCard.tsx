import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { PeriodComparison } from "../periodMetrics";

interface PeriodMetricCardProps {
  label: string;
  value: PeriodComparison;
  /** Falso quando aumentar é ruim, como em oportunidades descartadas. */
  higherIsBetter?: boolean;
  comparable: boolean;
}

function delta(value: PeriodComparison) {
  return value.current - value.previous;
}

export function PeriodMetricCard({
  label,
  value,
  higherIsBetter = true,
  comparable,
}: PeriodMetricCardProps) {
  const difference = delta(value);
  const Icon = difference === 0 ? Minus : difference > 0 ? ArrowUpRight : ArrowDownRight;
  const isGood = difference === 0 ? false : difference > 0 === higherIsBetter;

  return (
    <article className="rounded-xl border border-border/70 bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>

      <p className="mt-2 text-2xl font-semibold tabular-nums">{value.current}</p>

      {comparable && (
        <p
          className={`mt-2 flex items-center gap-1 text-xs ${
            difference === 0 ? "text-muted-foreground" : isGood ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          <Icon className="h-3 w-3" />
          {difference === 0
            ? `Igual ao período anterior (${value.previous})`
            : `${difference > 0 ? "+" : ""}${difference} ante ${value.previous} no período anterior`}
        </p>
      )}
    </article>
  );
}
