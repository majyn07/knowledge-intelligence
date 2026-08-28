"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { usePlans } from "@/features/plans/providers/PlansProvider";
import { useProject } from "@/providers/ProjectProvider";
import { migrateAssignment } from "@/models/Assignment";

import { AvatarUpload } from "./AvatarUpload";
import { TeamScope } from "./TeamScope";
import { PersonAvatar } from "./PersonAvatar";
import { usePeople } from "../providers/PeopleProvider";

const NO_TEAM = "__none__";

/**
 * Pessoas e equipes.
 *
 * Não há cadastro de pessoa: quem existe é quem entrou. Isso é decisão, não
 * limitação: uma lista de nomes digitados não corresponde a ninguém que possa
 * ser responsabilizado, e era exatamente o que o produto tinha antes.
 */
export function PeopleManager() {
  const { people, teams, me, updateMe, deactivate } = usePeople();
  const { projects } = useProject();
  const { plans } = usePlans();
  const { items: articles } = useLibrary();

  const [name, setName] = useState(me?.name ?? "");
  const [role, setRole] = useState(me?.role ?? "");

  /**
   * Quanto trabalho aponta para esta pessoa ou equipe.
   *
   * Compara identidade resolvida, não texto: registros anteriores guardam o
   * nome, e contar por igualdade crua deixaria de fora justamente o trabalho
   * que já existia.
   */
  function workload(ref: string) {
    const same = (stored: string) => migrateAssignment(stored, people, teams) === ref;

    return (
      projects.filter((project) => same(project.owner)).length +
      plans.filter((plan) => same(plan.owner)).length +
      articles.filter((article) => same(article.author)).length
    );
  }

  return (
    <PageSection
      title="Pessoas e equipes"
      description="Quem conduz o trabalho. A lista é formada por quem acessou, não há cadastro manual."
    >
      <div className="flex flex-col gap-6">
        {me ? (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold tracking-tight">Meu perfil</h3>

            <p className="mt-1 text-xs text-muted-foreground">
              {me.email} · entrou por link, sem senha
            </p>

            <div className="mt-4">
              <AvatarUpload
                person={me}
                onChange={(avatarUrl) => updateMe({ avatarUrl })}
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="me-name">Nome</Label>

                <Input
                  id="me-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Como você aparece nas atribuições"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="me-role">Cargo</Label>

                <Input
                  id="me-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Ex.: Analista de suporte"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="me-team">Equipe</Label>

                <Select
                  value={me.teamId || NO_TEAM}
                  onValueChange={(value) =>
                    void updateMe({ teamId: value === NO_TEAM ? "" : (value ?? "") })
                  }
                >
                  <SelectTrigger id="me-team">
                    <SelectValue>
                      {(id: string) =>
                        teams.find((team) => team.id === id)?.name ?? "Sem equipe"
                      }
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={NO_TEAM}>Sem equipe</SelectItem>

                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="mt-4"
              size="sm"
              disabled={name.trim() === "" || (name === me.name && role === me.role)}
              onClick={() => void updateMe({ name, role })}
            >
              Salvar meu perfil
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Sem servidor configurado, não há conta, e o histórico registra
              autoria pelo nome escolhido no cabeçalho.
            </p>
          </div>
        )}

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold tracking-tight">Equipes</h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Quatro equipes do suporte AltoQi. Uma pessoa pertence a uma delas, e
            atribuir à equipe é o caminho enquanto alguém não entrou.
          </p>

          <ul className="mt-4 flex flex-col gap-1.5">
            {teams.map((team) => {
              const membros = people.filter(
                (person) => person.isActive && person.teamId === team.id
              );

              return (
                <li
                  key={team.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{team.name}</span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {membros.length === 0
                        ? "ninguém entrou ainda"
                        : `${membros.length} ${membros.length === 1 ? "pessoa" : "pessoas"}`}
                    </span>

                    {workload(team.id) > 0 && (
                      <StatusBadge variant="default">
                        {workload(team.id)} atribuições
                      </StatusBadge>
                    )}
                  </span>

                  <div className="w-full">
                    <TeamScope team={team} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold tracking-tight">Quem já acessou</h3>

          {people.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Ninguém entrou ainda. A lista se forma sozinha conforme a equipe
              acessa pela primeira vez.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-1.5">
              {people.map((person) => (
                <li
                  key={person.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2.5 text-sm">
                    <PersonAvatar person={person} className="h-7 w-7 text-[10px]" />

                    <span className="min-w-0">
                      <span className="truncate font-medium">{person.name}</span>

                      <span className="ml-2 text-xs text-muted-foreground">
                        {teams.find((team) => team.id === person.teamId)?.name ?? "sem equipe"}
                      </span>
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    {!person.isActive && <StatusBadge variant="default">Inativa</StatusBadge>}

                    {workload(person.id) > 0 && (
                      <StatusBadge variant="default">
                        {workload(person.id)} atribuições
                      </StatusBadge>
                    )}

                    {person.id !== me?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void deactivate(person.id, !person.isActive)}
                      >
                        {person.isActive ? "Desativar" : "Reativar"}
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Desativar não remove: o histórico já registrou o que a pessoa fez, e
            apagar deixaria esses registros apontando para o vazio.
          </p>
        </div>
      </div>
    </PageSection>
  );
}
