"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { TimelineSkeleton } from "@/components/common/page/LoadingSkeleton";
import { RelativeDate } from "@/components/common/RelativeDate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActivityEvent } from "@/models/ActivityEvent";
import { ACTIVITY_TYPES, activityTypeLabel, type ActivityType } from "@/models/ActivityEvent";

import {
  auditActors,
  auditToCsv,
  defaultAuditFilters,
  filterAudit,
  type AuditFilters,
} from "../audit";
import { useActivity } from "../providers/ActivityProvider";

/** Quantas linhas por vez. Auditoria se lê em pedaços, e o resto sai no arquivo. */
const POR_PAGINA = 50;

/**
 * O histórico com as perguntas de quem administra.
 *
 * A linha do tempo responde "o que aconteceu neste projeto", e continua onde
 * está. Aqui as perguntas são outras — "o que esta pessoa fez", "o que mudou na
 * semana passada" — e a resposta atravessa iniciativas.
 *
 * **Não é um registro novo.** É a mesma coleção de eventos, que são
 * acrescentados e nunca editados. Um segundo registro paralelo divergiria do
 * primeiro, e o segundo é o que ninguém confere.
 */
export function AuditLog() {
  const { events, isHydrated } = useActivity();
  const [filters, setFilters] = useState<AuditFilters>(defaultAuditFilters);
  const [mostrando, setMostrando] = useState(POR_PAGINA);

  const pessoas = useMemo(() => auditActors(events), [events]);
  const filtrados = useMemo(() => filterAudit(events, filters), [events, filters]);

  function mudar(parcial: Partial<AuditFilters>) {
    setFilters((atual) => ({ ...atual, ...parcial }));

    /* Filtro novo, contagem do zero: continuar em 200 esconderia o começo da lista. */
    setMostrando(POR_PAGINA);
  }

  const limpo =
    filters.actor === "all" &&
    filters.type === "all" &&
    filters.desde === "" &&
    filters.ate === "" &&
    filters.busca.trim() === "";

  return (
    <PageSection
      title="Auditoria"
      description="Todo evento do produto, de todas as iniciativas, com quem fez e quando. É o mesmo histórico que alimenta a linha do tempo — aqui com as perguntas de quem administra."
    >
      {!isHydrated ? (
        <TimelineSkeleton />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
              <span className="text-xs text-muted-foreground">Buscar</span>

              <Input
                value={filters.busca}
                onChange={(evento) => mudar({ busca: evento.target.value })}
                placeholder="Assunto, detalhe ou pessoa…"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Quem</span>

              <select
                aria-label="Filtrar por pessoa"
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                value={filters.actor}
                onChange={(evento) => mudar({ actor: evento.target.value })}
              >
                <option value="all">Todas as pessoas</option>

                {pessoas.map((pessoa) => (
                  <option key={pessoa} value={pessoa}>
                    {pessoa}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">O que</span>

              <select
                aria-label="Filtrar por tipo de evento"
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                value={filters.type}
                onChange={(evento) => mudar({ type: evento.target.value as ActivityType | "all" })}
              >
                <option value="all">Tudo</option>

                {ACTIVITY_TYPES.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {activityTypeLabel[tipo]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">De</span>

              <Input
                type="date"
                className="w-[9.5rem]"
                value={filters.desde}
                onChange={(evento) => mudar({ desde: evento.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Até</span>

              <Input
                type="date"
                className="w-[9.5rem]"
                value={filters.ate}
                onChange={(evento) => mudar({ ate: evento.target.value })}
              />
            </label>

            {!limpo && (
              <Button variant="ghost" size="sm" onClick={() => mudar(defaultAuditFilters)}>
                Limpar
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {filtrados.length === 0
                ? "Nenhum evento neste recorte."
                : `${filtrados.length} ${filtrados.length === 1 ? "evento" : "eventos"}`}
            </p>

            {/* Sai o recorte que está na tela, e não a coleção inteira. */}
            <Button
              variant="outline"
              size="sm"
              disabled={filtrados.length === 0}
              onClick={() => exportar(filtrados)}
            >
              <Download className="h-4 w-4" aria-hidden />
              Exportar recorte
            </Button>
          </div>

          {filtrados.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full min-w-[46rem] text-sm">
                <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Quando</th>
                    <th className="px-4 py-2 font-medium">Quem</th>
                    <th className="px-4 py-2 font-medium">O que</th>
                    <th className="px-4 py-2 font-medium">Assunto</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/60">
                  {filtrados.slice(0, mostrando).map((event) => (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                        <RelativeDate value={event.at} />
                      </td>

                      <td className="px-4 py-2">
                        {/*
                          Sem autor não é "ninguém": é registro anterior à
                          existência de conta. Dizer "sem responsável"
                          afirmaria algo que não aconteceu.
                        */}
                        {event.actor.trim() === "" ? (
                          <span className="text-muted-foreground">Não registrado</span>
                        ) : (
                          event.actor
                        )}
                      </td>

                      <td className="px-4 py-2">
                        <Badge variant="outline" className="font-normal">
                          {activityTypeLabel[event.type]}
                        </Badge>
                      </td>

                      <td className="px-4 py-2">
                        <span className="block max-w-[22rem] truncate" title={event.subject.label}>
                          {event.subject.label}
                        </span>

                        {event.detail !== "" && (
                          <span className="mt-0.5 block max-w-[22rem] truncate text-xs text-muted-foreground">
                            {event.detail}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtrados.length > mostrando && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrando((atual) => atual + POR_PAGINA)}
            >
              Mostrar mais {Math.min(POR_PAGINA, filtrados.length - mostrando)}
            </Button>
          )}
        </div>
      )}
    </PageSection>
  );
}

function exportar(events: ActivityEvent[]) {
  const url = URL.createObjectURL(
    new Blob([auditToCsv(events)], { type: "text/csv;charset=utf-8" })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = "auditoria.csv";
  link.click();

  URL.revokeObjectURL(url);
}
