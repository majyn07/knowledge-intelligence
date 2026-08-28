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

import { toast } from "sonner";

import { useSession } from "@/features/auth/providers/SessionProvider";
import { usePersistedState } from "@/hooks/usePersistedState";
import { getSupabase } from "@/lib/supabase/client";
import { STORAGE_KEYS } from "@/lib/storage";
import type { Person, Team } from "@/models/Assignment";

import { seedTeams } from "../mock/teams";
import {
  readPeopleAndTeams,
  setPersonActive,
  setTeamScope as writeTeamScope,
  updateProfile,
} from "../peopleRepository";

interface PeopleContextValue {
  people: Person[];
  teams: Team[];
  isHydrated: boolean;

  /** Quem está operando agora, ou `null` quando ninguém se identificou. */
  me: Person | null;
  /** Nome de quem opera, para o histórico registrar autoria. */
  currentPerson: string;
  /** Só faz sentido sem servidor: com conta, quem opera é quem entrou. */
  setCurrentPerson: (name: string) => void;

  updateMe: (fields: { name?: string; role?: string; teamId?: string; avatarUrl?: string }) => Promise<void>;
  /** Edita o perfil de outra pessoa. Quem administra; o banco recusa o resto. */
  updatePerson: (
    id: string,
    fields: { name?: string; role?: string; teamId?: string; isAdmin?: boolean }
  ) => Promise<void>;
  deactivate: (id: string, isActive: boolean) => Promise<void>;
  /** Quem está usando administra? A tela pergunta antes de oferecer o botão. */
  souAdministrador: boolean;
  /** Por quais categorias do portal a equipe responde. */
  setTeamScope: (teamId: string, ids: { categoryIds?: string[]; sectionIds?: string[] }) => Promise<void>;

  /** Pessoas ativas de uma equipe. */
  peopleOfTeam: (teamId: string) => Person[];
}

const PeopleContext = createContext<PeopleContextValue | null>(null);

/**
 * Pessoas e equipes.
 *
 * Com servidor, pessoa é conta: a lista é quem entrou, e ninguém é cadastrado
 * à mão. Sem servidor, não há login: a lista fica vazia e o seletor de
 * "atuando como" continua sendo texto, como sempre foi.
 *
 * As equipes existem nos dois modos, porque classificam o trabalho e não
 * dependem de identidade.
 */
export function PeopleProvider({ children }: { children: ReactNode }) {
  const { state, email } = useSession();

  const [people, setPeople] = useState<Person[]>([]);
  const [teams, setTeams] = useState<Team[]>(seedTeams);
  const [isHydrated, setIsHydrated] = useState(false);

  /*
    Sem servidor não há sessão, e o histórico ficaria com autor vazio. O
    seletor manual continua existindo só para esse caso, e desaparece assim
    que há conta, porque aí quem opera é fato, não escolha.
  */
  const [localActor, setLocalActor] = useSharedActor();

  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase || state !== "conectado") {
      setIsHydrated(true);
      return;
    }

    let alive = true;

    readPeopleAndTeams(supabase)
      .then((data) => {
        if (!alive) return;
        setPeople(data.people);
        if (data.teams.length > 0) setTeams(data.teams);
      })
      .catch((error: unknown) => {
        toast.error(
          `Não foi possível carregar pessoas e equipes: ${
            error instanceof Error ? error.message : "erro desconhecido"
          }`
        );
      })
      .finally(() => {
        if (alive) setIsHydrated(true);
      });

    return () => {
      alive = false;
    };
  }, [state, supabase]);

  // Tempo real: alguém entrando pela primeira vez aparece na lista sem recarregar.
  useEffect(() => {
    if (!supabase || state !== "conectado" || !isHydrated) return;

    const channel = supabase.channel("sync:people");

    for (const table of ["profiles", "teams"] as const) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, async () => {
        const data = await readPeopleAndTeams(supabase).catch(() => null);

        if (data) {
          setPeople(data.people);
          if (data.teams.length > 0) setTeams(data.teams);
        }
      });
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isHydrated, state, supabase]);

  const me = useMemo(
    () => people.find((person) => person.email === email) ?? null,
    [email, people]
  );

  const currentPerson = me?.name ?? localActor;

  const updateMe = useCallback(
    async (fields: { name?: string; role?: string; teamId?: string; avatarUrl?: string }) => {
      if (!supabase || !me) return;

      try {
        await updateProfile(supabase, me.id, fields);
        toast.success("Perfil atualizado.");
      } catch (error) {
        toast.error(
          `Não foi possível salvar: ${
            error instanceof Error ? error.message : "erro desconhecido"
          }`
        );
      }
    },
    [me, supabase]
  );

  /**
   * Edita o perfil de outra pessoa. Só quem administra.
   *
   * A conferência de verdade é do banco, e não daqui: a política permite o
   * próprio perfil ou qualquer um se quem chama for administrador. Esta guarda
   * existe para a tela não oferecer o que vai ser recusado, e não para proteger.
   */
  const updatePerson = useCallback(
    async (
      id: string,
      fields: { name?: string; role?: string; teamId?: string; isAdmin?: boolean }
    ) => {
      if (!supabase) return;

      try {
        await updateProfile(supabase, id, fields);
        toast.success("Perfil atualizado.");
      } catch (error) {
        toast.error(
          `Não foi possível salvar: ${
            error instanceof Error ? error.message : "erro desconhecido"
          }`
        );
      }
    },
    [supabase]
  );

  const deactivate = useCallback(
    async (id: string, isActive: boolean) => {
      if (!supabase) return;

      try {
        await setPersonActive(supabase, id, isActive);
        toast.success(
          isActive
            ? "Pessoa reativada."
            : "Pessoa desativada. As atribuições já registradas continuam como estão."
        );
      } catch (error) {
        toast.error(
          `Não foi possível alterar: ${
            error instanceof Error ? error.message : "erro desconhecido"
          }`
        );
      }
    },
    [supabase]
  );

  const setTeamScope = useCallback(
    async (teamId: string, ids: { categoryIds?: string[]; sectionIds?: string[] }) => {
      if (!supabase) return;

      try {
        await writeTeamScope(supabase, teamId, ids);
      } catch (error) {
        toast.error(
          `Não foi possível salvar: ${
            error instanceof Error ? error.message : "erro desconhecido"
          }`
        );
      }
    },
    [supabase]
  );

  const peopleOfTeam = useCallback(
    (teamId: string) => people.filter((person) => person.isActive && person.teamId === teamId),
    [people]
  );

  const value = useMemo(
    () => ({
      people,
      teams,
      isHydrated,
      me,
      currentPerson,
      setCurrentPerson: setLocalActor,
      updateMe,
      updatePerson,
      deactivate,
      souAdministrador: me?.isAdmin ?? false,
      setTeamScope,
      peopleOfTeam,
    }),
    [
      currentPerson,
      deactivate,
      isHydrated,
      me,
      people,
      peopleOfTeam,
      setLocalActor,
      setTeamScope,
      teams,
      updateMe,
      updatePerson,
    ]
  );

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

/** Autor manual, usado apenas quando não há conta. */
function useSharedActor() {
  const [value, setValue] = usePersistedState<string>({
    key: STORAGE_KEYS.currentPerson,
    fallback: "",
  });

  const set = useCallback((name: string) => setValue(name), [setValue]);

  return [value, set] as const;
}

export function usePeople() {
  const context = useContext(PeopleContext);
  if (!context) throw new Error("usePeople deve ser utilizado dentro de PeopleProvider.");
  return context;
}
