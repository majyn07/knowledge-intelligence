"use client";

import { UserRound, Users } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveAssignment } from "@/models/Assignment";

import { usePeople } from "../providers/PeopleProvider";

interface PersonSelectProps {
  id: string;
  /**
   * Identificador de quem responde, pessoa ou equipe.
   *
   * Antes guardávamos o nome, para que remover alguém não apagasse o registro
   * de quem conduziu o trabalho. Com conta, o nome passou a ser editável pela
   * própria pessoa, e renomear orfanaria todas as atribuições dela. Quem
   * preserva o passado é o histórico, que guarda o rótulo do evento.
   */
  value: string;
  onChange: (ref: string) => void;
  placeholder?: string;
}

const NONE = "__none__";

export function PersonSelect({
  id,
  value,
  onChange,
  placeholder = "Sem atribuição",
}: PersonSelectProps) {
  const { people, teams } = usePeople();

  const active = people.filter((person) => person.isActive);
  const resolved = resolveAssignment(value, people, teams);

  return (
    <Select
      value={value || NONE}
      onValueChange={(next) => onChange(!next || next === NONE ? "" : next)}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder}>
          {() => resolved?.name ?? placeholder}
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>

        {/*
          Equipes primeiro, e não por hierarquia: enquanto a maior parte do
          time não entrou, atribuir à equipe é o caminho que de fato existe.
        */}
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            <span className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {team.name}
            </span>
          </SelectItem>
        ))}

        {active.map((person) => (
          <SelectItem key={person.id} value={person.id}>
            <span className="flex items-center gap-2">
              <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
              {person.name}
              {person.role && (
                <span className="text-xs text-muted-foreground">· {person.role}</span>
              )}
            </span>
          </SelectItem>
        ))}

        {/*
          Atribuição que não resolve continua selecionável: veio de um registro
          anterior, guardando um nome que a migração não reconheceu. Escondê-la
          faria o campo parecer vazio quando não está.
        */}
        {resolved?.kind === "unknown" && (
          <SelectItem value={value}>
            <span className="flex items-center gap-2 text-muted-foreground">
              {resolved.name} · registro anterior
            </span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
