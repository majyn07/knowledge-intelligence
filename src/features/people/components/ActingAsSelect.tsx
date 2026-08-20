"use client";

import { UserRound } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { usePeople } from "../providers/PeopleProvider";

const NONE = "__none__";

/**
 * Quem está operando o workspace. Não é autenticação — não há senha nem sessão.
 * Serve para o histórico registrar autoria em vez de gravar um autor vazio.
 */
export function ActingAsSelect() {
  const { people, currentPerson, setCurrentPerson } = usePeople();

  return (
    <div className="flex items-center gap-2">
      <UserRound className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />

      <Select
        value={currentPerson || NONE}
        onValueChange={(value) => setCurrentPerson(!value || value === NONE ? "" : value)}
      >
        <SelectTrigger
          aria-label="Atuando como"
          className="h-8 w-auto min-w-40 border-dashed text-xs"
        >
          <SelectValue>
            {(selected: string) =>
              selected && selected !== NONE ? selected : "Definir quem está atuando"
            }
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          <SelectItem value={NONE}>Sem identificação</SelectItem>

          {people.map((person) => (
            <SelectItem key={person.id} value={person.name}>
              {person.name}
              {person.role && (
                <span className="ml-2 text-xs text-muted-foreground">{person.role}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
