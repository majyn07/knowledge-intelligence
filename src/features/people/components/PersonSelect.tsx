"use client";

import { useState } from "react";
import { Plus, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { usePeople } from "../providers/PeopleProvider";

interface PersonSelectProps {
  id: string;
  /** Nome atribuído. Guardamos o nome, não a referência, para que remover
   *  alguém da lista não apague o registro de quem conduziu o trabalho. */
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}

const NONE = "__none__";

export function PersonSelect({ id, value, onChange, placeholder = "Sem atribuição" }: PersonSelectProps) {
  const { people, addPerson } = usePeople();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  // Um nome fora da lista continua válido: veio de antes ou a pessoa saiu.
  const isOrphan = Boolean(value) && !people.some((person) => person.name === value);

  function confirmAdd() {
    const person = addPerson(name, role);
    if (!person) return;

    onChange(person.name);
    setName("");
    setRole("");
    setIsAdding(false);
  }

  if (isAdding) {
    return (
      <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
        <Input
          autoFocus
          value={name}
          placeholder="Nome"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              confirmAdd();
            }
          }}
        />

        <Input
          value={role}
          placeholder="Papel (ex.: Analista de conhecimento)"
          onChange={(event) => setRole(event.target.value)}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={confirmAdd} disabled={!name.trim()}>
            Adicionar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Select
          value={value || NONE}
          onValueChange={(next) => onChange(!next || next === NONE ? "" : next)}
        >
          <SelectTrigger id={id} className="flex-1">
            <SelectValue>
              {(selected: string) => (selected && selected !== NONE ? selected : placeholder)}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            <SelectItem value={NONE}>{placeholder}</SelectItem>

            {isOrphan && <SelectItem value={value}>{value}</SelectItem>}

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

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Adicionar pessoa à lista"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remover atribuição"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOrphan && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserRound className="h-3 w-3" />
          {value} não está mais na lista de pessoas, mas a atribuição foi mantida.
        </p>
      )}
    </div>
  );
}
