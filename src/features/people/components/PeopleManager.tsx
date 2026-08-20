"use client";

import { useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { useProject } from "@/providers/ProjectProvider";

import { usePeople } from "../providers/PeopleProvider";

export function PeopleManager() {
  const { people, addPerson, removePerson } = usePeople();
  const { projects } = useProject();
  const { items: articles } = useLibrary();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  /** Quantas atribuições existentes apontam para esta pessoa. */
  function assignmentCount(personName: string) {
    return (
      projects.filter((project) => project.owner === personName).length +
      articles.filter((article) => article.author === personName).length
    );
  }

  function handleAdd() {
    if (addPerson(name, role)) {
      setName("");
      setRole("");
    }
  }

  return (
    <PageSection
      title="Pessoas"
      description="Quem pode ser atribuído como responsável de projeto ou autor de artigo. Não é um sistema de acesso: ninguém faz login aqui."
    >
      <div className="space-y-5">
        <ul className="divide-y divide-border/70 rounded-xl border border-border/70 bg-card">
          {people.map((person) => {
            const assignments = assignmentCount(person.name);

            return (
              <li key={person.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UserRound className="h-4 w-4" />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {person.role || "Sem papel definido"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {assignments > 0 && (
                    <StatusBadge variant="info">{assignments} atribuição(ões)</StatusBadge>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${person.name}`}
                    onClick={() => removePerson(person.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}

          {people.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma pessoa cadastrada. Adicione alguém para poder atribuir responsáveis.
            </li>
          )}
        </ul>

        <div className="rounded-xl border border-dashed border-border p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="person-name">Nome</Label>
              <Input
                id="person-name"
                value={name}
                placeholder="Ex.: Raoni Milioli da Silva"
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="person-role">Papel</Label>
              <Input
                id="person-role"
                value={role}
                placeholder="Ex.: Analista de conhecimento"
                onChange={(event) => setRole(event.target.value)}
              />
            </div>

            <Button onClick={handleAdd} disabled={!name.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Remover alguém tira o nome das próximas atribuições, mas preserva as já registradas —
            o histórico de quem conduziu o trabalho não é reescrito.
          </p>
        </div>
      </div>
    </PageSection>
  );
}
