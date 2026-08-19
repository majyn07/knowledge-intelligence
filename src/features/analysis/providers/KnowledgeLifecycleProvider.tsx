"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { usePersistedState } from "@/hooks/usePersistedState";
import type { AnalysisMessage } from "@/models/AnalysisMessage";
import type { KnowledgeOpportunity } from "@/features/analysis/types/KnowledgeOpportunity";
import type {
  AnalysisRecord,
  AnalysisStatus,
  OpportunityWorkflowStatus,
} from "@/models/KnowledgeLifecycle";

const STORAGE_KEY = "visus-knowledge-lifecycle";

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

function parseAnalyses(raw: string): AnalysisRecord[] {
  const stored = JSON.parse(raw) as AnalysisRecord[];
  // Registros gravados antes da evidência ser persistida não possuem o campo.
  return stored.map((record) => ({ ...record, relatedArticles: record.relatedArticles ?? [] }));
}

export function KnowledgeLifecycleProvider({ children }: { children: ReactNode }) {
  const [analyses, setAnalyses] = usePersistedState<AnalysisRecord[]>({
    key: STORAGE_KEY,
    fallback: [],
    parse: parseAnalyses,
  });

  const saveAnalysis = useCallback((input: Omit<AnalysisRecord, "id" | "startedAt" | "status">) => {
    const record: AnalysisRecord = {
      ...input,
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      status: "in_review",
    };
    setAnalyses((current) => [record, ...current.filter((item) => !(item.projectId === record.projectId && item.ticketId === record.ticketId && item.status !== "completed"))]);
    return record;
  }, [setAnalyses]);

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
  }, [setAnalyses]);

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
  }, [setAnalyses]);

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
