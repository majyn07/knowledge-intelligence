"use client";

import { AlertTriangle } from "lucide-react";

import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import type { Team } from "@/models/Assignment";

import { usePeople } from "../providers/PeopleProvider";
import { teamsOfCategory, teamsOfSection } from "../suggestTeam";

/**
 * Por onde a equipe responde: categorias do portal e, quando preciso, seções.
 *
 * Serve para o produto **sugerir** o responsável quando alguém classifica um
 * artigo, e nada além disso: a atribuição continua sendo escolha de quem
 * preenche. Derivar automaticamente criaria um responsável que ninguém
 * escolheu — e em QiOnboarding ou Novidades de Release, que não têm equipe
 * óbvia, o palpite apareceria com cara de decisão.
 *
 * A seção existe aqui porque a categoria sozinha não descreve o suporte do
 * Builder: ali as disciplinas são seções, e Elétrica e Hidráulica são equipes
 * diferentes dentro da mesma categoria. Quem responde pelo produto inteiro —
 * Visus, Eberick — declara só a categoria e não precisa abrir esta parte.
 *
 * É cadastro, e não um mapa no código: as categorias do portal mudam e as
 * equipes do suporte mudam, e ninguém vai abrir o código para acompanhar.
 */
export function TeamScope({ team }: { team: Team }) {
  const { taxonomy } = useTaxonomy();
  const { teams, setTeamScope } = usePeople();

  const products = taxonomy.categories.filter((category) => category.isProduct);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  const toggleCategory = (categoryId: string) => {
    const categoryIds = toggle(team.categoryIds, categoryId);

    /*
      Deixar de responder pela categoria leva junto as seções dela: seção
      declarada sem a categoria correspondente é um refinamento de algo que a
      equipe não cobre mais, e continuaria sugerindo em silêncio.
    */
    const sectionIds = team.sectionIds.filter((sectionId) => {
      const section = taxonomy.sections.find((item) => item.id === sectionId);
      return section ? categoryIds.includes(section.categoryId) : false;
    });

    void setTeamScope(team.id, { categoryIds, sectionIds });
  };

  const toggleSection = (sectionId: string) => {
    void setTeamScope(team.id, { sectionIds: toggle(team.sectionIds, sectionId) });
  };

  /*
    Duas equipes no mesmo lugar é permitido — pode ser a realidade do suporte —
    mas desliga a sugestão, porque escolher uma delas seria arbitrário. Avisar
    aqui é melhor que a pessoa notar que o campo parou de vir preenchido e não
    entender por quê.

    A categoria disputada só é problema quando nenhuma seção dela foi
    declarada: é exatamente assim que o Builder é dividido, e avisar ali seria
    apontar como defeito o arranjo que a tela acabou de pedir.
  */
  const disputadas = team.categoryIds.filter((categoryId) => {
    if (teamsOfCategory(categoryId, teams).length < 2) return false;

    return !taxonomy.sections.some(
      (section) => section.categoryId === categoryId && teamsOfSection(section.id, teams).length > 0
    );
  });

  const disputadasPorSecao = team.sectionIds.filter(
    (sectionId) => teamsOfSection(sectionId, teams).length > 1
  );

  const secoesDisponiveis = taxonomy.sections
    .filter((section) => team.categoryIds.includes(section.categoryId))
    .sort((a, b) => a.order - b.order);

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
              onClick={() => toggleCategory(category.id)}
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

      {secoesDisponiveis.length > 0 && (
        <details className="group mt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Refinar por seção
            {team.sectionIds.length > 0 && ` (${team.sectionIds.length})`}
          </summary>

          <p className="mt-2 text-xs text-muted-foreground">
            Só é preciso quando duas equipes dividem a mesma categoria — como as
            disciplinas do Builder. A seção declarada vence a categoria; o que ninguém declarou
            continua respondendo pela categoria.
          </p>

          <div className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
            {secoesDisponiveis.map((section) => {
              const selected = team.sectionIds.includes(section.id);

              return (
                <button
                  key={section.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleSection(section.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    selected
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {section.name}
                </button>
              );
            })}
          </div>
        </details>
      )}

      {(disputadas.length > 0 || disputadasPorSecao.length > 0) && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />

          <span>
            {disputadas.length > 0 && (
              <>
                {disputadas.length === 1 ? "Uma categoria" : `${disputadas.length} categorias`}{" "}
                {disputadas.length === 1 ? "é declarada" : "são declaradas"} por outra equipe sem
                divisão por seção. A sugestão fica desligada nelas — refine por seção ou deixe a
                atribuição manual.
              </>
            )}

            {disputadas.length > 0 && disputadasPorSecao.length > 0 && " "}

            {disputadasPorSecao.length > 0 && (
              <>
                {disputadasPorSecao.length === 1
                  ? "Uma seção também é declarada"
                  : `${disputadasPorSecao.length} seções também são declaradas`}{" "}
                por outra equipe, e ali a sugestão também fica desligada.
              </>
            )}
          </span>
        </p>
      )}
    </div>
  );
}
