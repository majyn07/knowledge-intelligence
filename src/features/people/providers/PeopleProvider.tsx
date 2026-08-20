"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { toast } from "sonner";

import { usePersistedState } from "@/hooks/usePersistedState";
import type { Person } from "@/models/Person";

import { people as seedPeople } from "../mock/people";

const STORAGE_KEY = "visus-people";
const CURRENT_KEY = "visus-current-person";

interface PeopleContextValue {
  people: Person[];
  /** Quem está operando agora. Não é sessão autenticada: serve para o
   *  histórico registrar autoria em vez de gravar um autor vazio. */
  currentPerson: string;
  setCurrentPerson: (name: string) => void;
  addPerson: (name: string, role: string) => Person | undefined;
  removePerson: (id: string) => void;
  renamePerson: (id: string, name: string, role: string) => void;
}

const PeopleContext = createContext<PeopleContextValue | null>(null);

export function PeopleProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = usePersistedState<Person[]>({
    key: STORAGE_KEY,
    fallback: seedPeople,
  });

  const [currentPerson, setCurrentPerson] = usePersistedState<string>({
    key: CURRENT_KEY,
    fallback: "",
  });

  const addPerson = useCallback(
    (name: string, role: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return undefined;

      if (people.some((person) => person.name.toLowerCase() === trimmedName.toLowerCase())) {
        toast.error("Já existe alguém com este nome na lista.");
        return undefined;
      }

      const person: Person = {
        id: crypto.randomUUID(),
        name: trimmedName,
        role: role.trim(),
      };

      setPeople((current) => [...current, person]);
      toast.success(`${trimmedName} adicionado(a) à lista.`);
      return person;
    },
    [people, setPeople]
  );

  const removePerson = useCallback(
    (id: string) => {
      const person = people.find((item) => item.id === id);
      setPeople((current) => current.filter((item) => item.id !== id));

      if (person) {
        toast.success(
          `${person.name} removido(a) da lista. As atribuições já registradas continuam como estão.`
        );
      }
    },
    [people, setPeople]
  );

  const renamePerson = useCallback(
    (id: string, name: string, role: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      setPeople((current) =>
        current.map((person) =>
          person.id === id ? { ...person, name: trimmedName, role: role.trim() } : person
        )
      );
    },
    [setPeople]
  );

  const value = useMemo(
    () => ({ people, currentPerson, setCurrentPerson, addPerson, removePerson, renamePerson }),
    [addPerson, currentPerson, people, removePerson, renamePerson, setCurrentPerson]
  );

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople() {
  const context = useContext(PeopleContext);
  if (!context) throw new Error("usePeople deve ser utilizado dentro de PeopleProvider.");
  return context;
}
