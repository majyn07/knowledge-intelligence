"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { useSharedCollection } from "@/hooks/useSharedCollection";
import { parseAnalyses } from "../normalizeAnalysis";
import { fromAnalysis, toAnalysis } from "@/lib/supabase/domainRows";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import type { AnalysisMessage } from "@/models/AnalysisMessage";
import type { KnowledgeOpportunity } from "@/features/analysis/types/KnowledgeOpportunity";
import type {
  AnalysisRecord,
  AnalysisStatus,
  OpportunityWorkflowStatus,
} from "@/models/KnowledgeLifecycle";
import { STORAGE_KEYS } from "@/lib/storage";

const STORAGE_KEY = STORAGE_KEYS.analyses;

interface KnowledgeLifecycleValue {
  analyses: AnalysisRecord[];
  saveAnalysis: (input: Omit<AnalysisRecord, "id" | "startedAt" | "status">) => AnalysisRecord;
  updateMessages: (analysisId: string, messages: AnalysisMessage[]) => void;
  updateOpportunityStatus: (
    analysisId: string,
    opportunityId: string,
    status: OpportunityWorkflowStatus
  ) => void;
  updateOpportunity: (
    analysisId: string,
    opportunityId: string,
    changes: Pick<KnowledgeOpportunity, "title" | "description" | "justification">
  ) => void;
  linkOpportunityToPlan: (
    analysisId: string,
    opportunityId: string,
    planId: string
  ) => void;
  setAnalysisStatus: (analysisId: string, status: AnalysisStatus) => void;
  getAnalysis: (projectId: string, ticketId: string) => AnalysisRecord | undefined;
}

const KnowledgeLifecycleContext = createContext<KnowledgeLifecycleValue | null>(null);

export function KnowledgeLifecycleProvider({ children }: { children: ReactNode }) {
  const { record } = useActivity();
  const { currentPerson } = usePeople();
  const [analyses, setAnalyses] = useSharedCollection<AnalysisRecord>({
    key: STORAGE_KEY,
    table: "analyses",
    fallback: [],
    parseLocal: parseAnalyses,
    fromRows: (rows) => rows.map(toAnalysis),
    toRow: fromAnalysis,
    identify: (analysis) => analysis.id,
  });

  const saveAnalysis = useCallback((input: Omit<AnalysisRecord, "id" | "startedAt" | "status">) => {
    const analysis: AnalysisRecord = {
      ...input,
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      status: "in_review",
    };
    setAnalyses((current) => [analysis, ...current.filter((item) => !(item.projectId === analysis.projectId && item.ticketId === analysis.ticketId && item.status !== "completed"))]);
    record({
      type: "analysis_started",
      projectId: analysis.projectId,
      actor: currentPerson,
      subject: { kind: "analysis", id: analysis.id, label: analysis.result.identification.title },
      detail: `Atendimento #${analysis.ticketId} analisado, com ${analysis.result.opportunities.length} oportunidade(s) proposta(s).`,
    });
    return analysis;
  }, [currentPerson, record, setAnalyses]);

  const updateMessages = useCallback((analysisId: string, messages: AnalysisMessage[]) => {
    setAnalyses((current) => current.map((item) => item.id === analysisId ? { ...item, messages } : item));
  }, [setAnalyses]);

  const updateOpportunityStatus = useCallback((analysisId: string, opportunityId: string, status: OpportunityWorkflowStatus) => {
    setAnalyses((current) => current.map((item) => item.id !== analysisId ? item : {
      ...item,
      result: {
        ...item.result,
        opportunities: item.result.opportunities.map((opportunity) => opportunity.id !== opportunityId ? opportunity : { ...opportunity, status }),
      },
    }));

    const decisionType = {
      approved: "opportunity_approved",
      discarded: "opportunity_discarded",
      deferred: "opportunity_deferred",
    }[status as string];

    if (!decisionType) return;

    const analysis = analyses.find((item) => item.id === analysisId);
    const opportunity = analysis?.result.opportunities.find((item) => item.id === opportunityId);
    if (!analysis || !opportunity) return;

    record({
      type: decisionType as "opportunity_approved" | "opportunity_discarded" | "opportunity_deferred",
      projectId: analysis.projectId,
      actor: currentPerson,
      subject: { kind: "opportunity", id: opportunity.id, label: opportunity.title },
      detail: `Decisão humana registrada na análise do atendimento #${analysis.ticketId}.`,
    });
  }, [analyses, currentPerson, record, setAnalyses]);

  const updateOpportunity = useCallback((analysisId: string, opportunityId: string, changes: Pick<KnowledgeOpportunity, "title" | "description" | "justification">) => {
    setAnalyses((current) => current.map((item) => item.id !== analysisId ? item : {
      ...item,
      result: {
        ...item.result,
        opportunities: item.result.opportunities.map((opportunity) => opportunity.id !== opportunityId ? opportunity : { ...opportunity, ...changes }),
      },
    }));
  }, [setAnalyses]);

  const linkOpportunityToPlan = useCallback((analysisId: string, opportunityId: string, planId: string) => {
    setAnalyses((current) => current.map((item) => item.id !== analysisId ? item : {
      ...item,
      result: {
        ...item.result,
        opportunities: item.result.opportunities.map((opportunity) => opportunity.id !== opportunityId ? opportunity : { ...opportunity, planId }),
      },
    }));
  }, [setAnalyses]);

  const setAnalysisStatus = useCallback((analysisId: string, status: AnalysisStatus) => {
    setAnalyses((current) => current.map((item) => item.id !== analysisId ? item : {
      ...item,
      status,
      completedAt: status === "completed" ? new Date().toISOString() : undefined,
    }));

    if (status !== "completed") return;

    const analysis = analyses.find((item) => item.id === analysisId);
    if (!analysis) return;

    const approved = analysis.result.opportunities.filter((item) => item.status === "approved").length;
    record({
      type: "analysis_completed",
      projectId: analysis.projectId,
      actor: currentPerson,
      subject: { kind: "analysis", id: analysis.id, label: analysis.result.identification.title },
      detail: `Revisão finalizada com ${approved} oportunidade(s) aprovada(s).`,
    });
  }, [analyses, currentPerson, record, setAnalyses]);

  const value = useMemo(() => ({
    analyses,
    saveAnalysis,
    updateMessages,
    updateOpportunityStatus,
    updateOpportunity,
    linkOpportunityToPlan,
    setAnalysisStatus,
    getAnalysis: (projectId: string, ticketId: string) => analyses.find((item) => item.projectId === projectId && item.ticketId === ticketId),
  }), [analyses, linkOpportunityToPlan, saveAnalysis, setAnalysisStatus, updateMessages, updateOpportunity, updateOpportunityStatus]);

  return <KnowledgeLifecycleContext.Provider value={value}>{children}</KnowledgeLifecycleContext.Provider>;
}

export function useKnowledgeLifecycle() {
  const context = useContext(KnowledgeLifecycleContext);
  if (!context) throw new Error("useKnowledgeLifecycle must be used within KnowledgeLifecycleProvider.");
  return context;
}
