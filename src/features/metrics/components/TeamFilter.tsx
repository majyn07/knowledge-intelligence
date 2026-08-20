"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Team } from "@/models/Assignment";

import type { TeamScope } from "../teamScope";

interface TeamFilterProps {
  teams: Team[];
  value: string | null;
  onChange: (teamId: string | null) => void;
}

export function TeamFilter({ teams, value, onChange }: TeamFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Equipe">
      <Button
        size="sm"
        variant={value === null ? "default" : "outline"}
        onClick={() => onChange(null)}
      >
        Todas as equipes
      </Button>

      {teams.map((team) => (
        <Button
          key={team.id}
          size="sm"
          variant={value === team.id ? "default" : "outline"}
          onClick={() => onChange(team.id)}
        >
          {team.name}
        </Button>
      ))}
    </div>
  );
}

/**
 * O que o recorte por equipe não alcança.
 *
 * Plano tem responsável e artigo tem autor. Atendimento e análise não têm — e
 * quem escolhe uma equipe precisa saber que aqueles números continuam sendo
 * do projeto inteiro. Sem esta linha, a tela pareceria dizer que a equipe
 * registrou 3 atendimentos, o que ela nunca mediu.
 */
export function TeamScopeNotice({ scope }: { scope: TeamScope }) {
  if (!scope.isScoped) return null;

  return (
    <p className="flex items-start gap-2 rounded-lg border border-[var(--ring)] bg-accent p-3 text-xs">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />

      <span>
        O recorte por equipe vale para <strong>planos e artigos</strong>, que têm
        responsável. Atendimentos e análises não têm atribuição, então seguem
        contados por projeto inteiro.
        {scope.unassigned > 0 && (
          <>
            {" "}
            <strong>{scope.unassigned}</strong> registro(s) estão sem responsável
            e não entram em equipe nenhuma.
          </>
        )}
      </span>
    </p>
  );
}
