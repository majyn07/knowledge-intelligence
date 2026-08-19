"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

function loadAnalyses(): AnalysisRecord[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as AnalysisRecord[];
  } catch {
    return [];
  }
}

export function KnowledgeLifecycleProvider({ children }: { children: ReactNode }) {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>(loadAnalyses);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
  }, [analyses]);

  const saveAnalysis = useCallback((input: Omit<AnalysisRecord, "id" | "startedAt" | "status">) => {
    const record: AnalysisRecord = {
      ...input,
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      status: "in_review",
    };
    setAnalyses((current) => [record, ...current.filter((item) => !(item.projectId === record.projectId && item.ticketId === record.ticketId && item.status !== "completed"))]);
    return record;
  }, []);

  const updateMessages = useCallback((analysisId: string, messages: AnalysisMessage[]) => {
    setAnalyses((current) => current.map((item) => item.id === analysisId ? { ...item, messages } : item));
  }, []);

  const updateOpportunityStatus = useCallback((analysisId: string, opportunityId: string, status: OpportunityWorkflowStatus) => {
    setAnalyses((current) => current.map((item) => item.id !== analysisId ? item : {
      ...item,
      result: {
        ...item.result,
        opportunities: item.result.opportunities.map((opportunity) => opportunity.id !== opportunityId ? opportunity : { ...opportunity, status }),
      },
    }));
  }, []);

  const updateOpportunity = useCallback((analysisId: string, opportunityId: string, changes: Pick<KnowledgeOpportunity, "title" | "description" | "justification">) => {
    setAnalyses((current) => current.map((item) => item.id !== analysisId ? item : {
      ...item,
      result: {
        ...item.result,
        opportunities: item.result.opportunities.map((opportunity) => opportunity.id !== opportunityId ? opportunity : { ...opportunity, ...changes }),
      },
    }));
  }, []);

  const linkOpportunityToPlan = useCallback((analysisId: string, opportunityId: string, planId: string) => {
    setAnalyses((current) => current.map((item) => item.id !== analysisId ? item : {
      ...item,
      result: {
        ...item.result,
        opportunities: item.result.opportunities.map((opportunity) => opportunity.id !== opportunityId ? opportunity : { ...opportunity, planId }),
      },
    }));
  }, []);

  const setAnalysisStatus = useCallback((analysisId: string, status: AnalysisStatus) => {
    setAnalyses((current) => current.map((item) => item.id !== analysisId ? item : {
      ...item,
      status,
      completedAt: status === "completed" ? new Date().toISOString() : undefined,
    }));
  }, []);

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
