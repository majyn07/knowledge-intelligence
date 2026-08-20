"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { useSharedCollection } from "@/hooks/useSharedCollection";
import { parseEvents } from "../normalizeEvent";
import { fromEvent, toEvent } from "@/lib/supabase/domainRows";
import type { ActivityEvent } from "@/models/ActivityEvent";
import { STORAGE_KEYS } from "@/lib/storage";

const STORAGE_KEY = STORAGE_KEYS.activity;
/** Limite defensivo: o histórico vive no navegador e não pode crescer sem fim. */
const MAX_EVENTS = 500;

export type ActivityInput = Omit<ActivityEvent, "id" | "at">;

interface ActivityContextValue {
  events: ActivityEvent[];
  record: (input: ActivityInput) => void;
  /** Eventos de uma entidade específica, do mais recente ao mais antigo. */
  eventsFor: (kind: ActivityEvent["subject"]["kind"], id: string) => ActivityEvent[];
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useSharedCollection<ActivityEvent>({
    key: STORAGE_KEY,
    table: "activity_events",
    fallback: [],
    parseLocal: parseEvents,
    fromRows: (rows) => rows.map(toEvent),
    toRow: fromEvent,
    identify: (event) => event.id,
  });

  const record = useCallback(
    (input: ActivityInput) => {
      const event: ActivityEvent = {
        ...input,
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
      };

      setEvents((current) => [event, ...current].slice(0, MAX_EVENTS));
    },
    [setEvents]
  );

  const eventsFor = useCallback(
    (kind: ActivityEvent["subject"]["kind"], id: string) =>
      events.filter((event) => event.subject.kind === kind && event.subject.id === id),
    [events]
  );

  const value = useMemo(() => ({ events, record, eventsFor }), [events, eventsFor, record]);

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) throw new Error("useActivity deve ser utilizado dentro de ActivityProvider.");
  return context;
}
