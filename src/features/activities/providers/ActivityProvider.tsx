"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { usePeople } from "@/features/people/providers/PeopleProvider";
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
  /** Falso até o conteúdo guardado ser lido, após a montagem. */
  isHydrated: boolean;
  record: (input: ActivityInput) => void;
  /** Eventos de uma entidade específica, do mais recente ao mais antigo. */
  eventsFor: (kind: ActivityEvent["subject"]["kind"], id: string) => ActivityEvent[];
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  /*
    Depende de People, e é a única dependência daqui.

    Ela fica acima na ordem dos providers desde sempre, então nada se moveu. O
    que muda é o motivo: o evento precisa saber **quem** age, e perguntar num
    lugar só é o que impede os vinte e dois chamadores de divergirem.
  */
  const { currentPersonId } = usePeople();
  const [events, setEvents, isHydrated] = useSharedCollection<ActivityEvent>({
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
        /*
          O identificador de quem age é carimbado **aqui**, e não nos vinte e
          dois lugares que chamam esta função.

          Foi por espalhar que o `actor` divergiu: cada provider montava o seu,
          e um deles caía no autor do artigo quando não havia sessão — o que
          pôs "team-suporte-estruturas" no histórico como pessoa. Num funil só,
          não há como um chamador esquecer.

          O rótulo continua vindo de quem chama, porque ele é do evento: quem
          registra sabe se está agindo em nome próprio.
        */
        ...(currentPersonId ? { actorId: currentPersonId } : {}),
      };

      setEvents((current) => [event, ...current].slice(0, MAX_EVENTS));
    },
    [currentPersonId, setEvents]
  );

  const eventsFor = useCallback(
    (kind: ActivityEvent["subject"]["kind"], id: string) =>
      events.filter((event) => event.subject.kind === kind && event.subject.id === id),
    [events]
  );

  const value = useMemo(
    () => ({ events, isHydrated, record, eventsFor }),
    [events, eventsFor, isHydrated, record]
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) throw new Error("useActivity deve ser utilizado dentro de ActivityProvider.");
  return context;
}
