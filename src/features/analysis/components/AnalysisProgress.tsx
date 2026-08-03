import { Check, CircleDot, FileSearch, ListTodo, ScanSearch, UserRoundCheck } from "lucide-react";

import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";

interface AnalysisProgressProps {
  analysis?: AnalysisRecord;
}

export function AnalysisProgress({ analysis }: AnalysisProgressProps) {
  const decisionsComplete = analysis ? analysis.result.opportunities.every((opportunity) => opportunity.status !== "proposed") : false;
  const steps = [
    { label: "Atendimento", icon: FileSearch, state: "complete" },
    { label: "Análise da IA", icon: ScanSearch, state: analysis ? "complete" : "current" },
    { label: "Revisão humana", icon: UserRoundCheck, state: analysis && !decisionsComplete ? "current" : analysis ? "complete" : "pending" },
    { label: "Decisão", icon: CircleDot, state: decisionsComplete ? "complete" : "pending" },
    { label: "Plano de melhoria", icon: ListTodo, state: analysis?.status === "completed" ? "current" : "pending" },
  ];

  return (
    <ol className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-5">
      {steps.map(({ label, icon: Icon, state }) => (
        <li key={label} className="flex min-w-0 items-center gap-3 sm:flex-col sm:items-start">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${state === "complete" ? "bg-emerald-500 text-white" : state === "current" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {state === "complete" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
          </span>
          <span className={`text-xs font-medium ${state === "current" ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
        </li>
      ))}
    </ol>
  );
}
