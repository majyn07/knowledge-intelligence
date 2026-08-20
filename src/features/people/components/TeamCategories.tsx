"use client";

import { AlertTriangle } from "lucide-react";

import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import type { Team } from "@/models/Assignment";

import { usePeople } from "../providers/PeopleProvider";
import { teamsOfCategory } from "../suggestTeam";

/**
 * Por quais categorias do portal a equipe responde.
 *
 * Serve para o produto **sugerir** o responsável quando alguém classifica um
 * artigo, e nada além disso: a atribuição continua sendo escolha de quem
 * preenche. Derivar automaticamente criaria um responsável que ninguém
 * escolheu — e em QiOnboarding ou Novidades de Release, que não têm equipe
 * óbvia, o palpite apareceria com cara de decisão.
 *
 * É cadastro, e não um mapa no código: as categorias do portal mudam e as
 * equipes do suporte mudam, e ninguém vai abrir o código para acompanhar.
 */
export function TeamCategories({ team }: { team: Team }) {
  const { taxonomy } = useTaxonomy();
  const { teams, setTeamCategories } = usePeople();

  const products = taxonomy.categories.filter((category) => category.isProduct);

  const toggle = (categoryId: string) => {
    const next = team.categoryIds.includes(categoryId)
      ? team.categoryIds.filter((id) => id !== categoryId)
      : [...team.categoryIds, categoryId];

    void setTeamCategories(team.id, next);
  };

  /*
    Duas equipes na mesma categoria é permitido — pode ser a realidade do
    suporte — mas desliga a sugestão, porque escolher uma delas seria
    arbitrário. Avisar aqui é melhor que a pessoa notar que o campo parou de
    vir preenchido e não entender por quê.
  */
  const disputadas = team.categoryIds.filter(
    (categoryId) => teamsOfCategory(categoryId, teams).length > 1
  );

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <p className="text-xs text-muted-foreground">
        Responde por — usado para sugerir esta equipe ao classificar um artigo.
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {products.map((category) => {
          const selected = team.categoryIds.includes(category.id);

          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(category.id)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                selected
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/70 text-muted-foreground hover:border-primary/30"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {disputadas.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />

          <span>
            {disputadas.length === 1 ? "Uma categoria" : `${disputadas.length} categorias`} também
            {disputadas.length === 1 ? " é declarada" : " são declaradas"} por outra equipe. A
            sugestão fica desligada nelas — a atribuição continua manual.
          </span>
        </p>
      )}
    </div>
  );
}
