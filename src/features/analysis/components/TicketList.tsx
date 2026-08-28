"use client";

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Ticket } from "@/models/Ticket";

import type { TicketRecorteResult } from "../hooks/useTicketRecorte";
import { ticketsToCsv } from "../ticketCsv";
import {
  defaultTicketColumns,
  ticketSortLabel,
  ticketStage,
  ticketStageLabel,
  type TicketCycle,
} from "../ticketTableView";
import {
  TICKET_SORTS,
  TICKET_STAGE_FILTERS,
  ticketStageFilterLabel,
} from "../ticketUrlState";

interface TicketListProps {
  recorte: TicketRecorteResult;
  ciclo: TicketCycle;
  selectedTicketId: string;
  onSelectTicket: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * A lista de atendimentos, feita para volume.
 *
 * Ela renderizava todos numa barra rolante, o que funcionava com três. Com mil
 * é a grade de 1.800 cartões de novo: a rolagem esconde onde a pessoa está e
 * impede voltar ao mesmo ponto.
 *
 * O recorte vem pronto de `useTicketRecorte`, e vive na URL: apontar para "os
 * resolvidos que ninguém leu" precisa de um endereço, porque é isso que se
 * cola no chat da equipe.
 */
export function TicketList({
  recorte,
  ciclo,
  selectedTicketId,
  onSelectTicket,
  isCollapsed = false,
  onToggleCollapse,
}: TicketListProps) {
  if (isCollapsed) {
    return (
      <aside className="flex flex-col items-center rounded-xl border border-border/70 bg-card py-4 shadow-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  aria-label="Expandir painel de atendimentos"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent side="right">
              Expandir atendimentos ({recorte.total})
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-96 flex-col overflow-hidden rounded-xl border border-border/70 bg-card xl:h-full">
      <header className="border-b border-border/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Atendimentos</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {recorte.temRecorte
                ? `${recorte.total} no recorte`
                : `${recorte.total} atendimento(s)`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {recorte.temRecorte && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={recorte.limpar}
              >
                <X className="h-3 w-3" />
                Limpar
              </Button>
            )}

            {onToggleCollapse && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={onToggleCollapse}
                        aria-label="Recolher painel de atendimentos"
                      >
                        <PanelLeftClose className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom">Recolher painel</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 rounded-lg bg-muted/45 pl-8 text-xs"
            placeholder="Assunto, empresa, solução ou nº do chamado..."
            value={recorte.filters.search}
            onChange={(event) =>
              recorte.setFilters({ ...recorte.filters, search: event.target.value })
            }
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {TICKET_STAGE_FILTERS.map((etapa) => (
            <Button
              key={etapa}
              variant={recorte.filters.stage === etapa ? "secondary" : "ghost"}
              size="sm"
              className="h-6 rounded-full px-2.5 text-[11px]"
              onClick={() => recorte.setFilters({ ...recorte.filters, stage: etapa })}
            >
              {ticketStageFilterLabel[etapa]}
            </Button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            className="h-7 min-w-0 flex-1 rounded-lg border border-border/70 bg-muted/45 px-2 text-[11px]"
            value={recorte.filters.company}
            onChange={(event) =>
              recorte.setFilters({ ...recorte.filters, company: event.target.value })
            }
            aria-label="Filtrar por empresa"
          >
            <option value="all">Todas as empresas</option>
            {recorte.empresas.map((empresa) => (
              <option key={empresa} value={empresa}>
                {empresa}
              </option>
            ))}
          </select>

          <select
            className="h-7 rounded-lg border border-border/70 bg-muted/45 px-2 text-[11px]"
            value={recorte.sort}
            onChange={(event) =>
              recorte.setSort(event.target.value as TicketRecorteResult["sort"])
            }
            aria-label="Ordenar atendimentos"
          >
            {TICKET_SORTS.map((ordem) => (
              <option key={ordem} value={ordem}>
                {ticketSortLabel[ordem]}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {recorte.pagina.map((ticket) => (
          <TicketRow
            key={ticket.id}
            ticket={ticket}
            ciclo={ciclo}
            selected={ticket.id === selectedTicketId}
            onSelect={onSelectTicket}
          />
        ))}

        {recorte.total === 0 && (
          <div className="px-4 py-10 text-center text-xs leading-5 text-muted-foreground">
            {recorte.temRecorte
              ? "Nenhum atendimento neste recorte."
              : "Nenhum atendimento ainda. Importe de um arquivo ou cadastre o primeiro."}
          </div>
        )}
      </div>

      {recorte.total > 0 && (
        <div className="border-t border-border/70 px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full gap-1.5 text-xs"
            onClick={() => exportar(recorte.filtrados, ciclo)}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar {recorte.total} em CSV
          </Button>
        </div>
      )}

      {recorte.pages > 1 && (
        <footer className="flex items-center justify-between gap-2 border-t border-border/70 px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={recorte.page <= 1}
            onClick={() => recorte.setPage(recorte.page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </Button>

          <span className="text-[11px] text-muted-foreground">
            {recorte.page} de {recorte.pages}
          </span>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={recorte.page >= recorte.pages}
            onClick={() => recorte.setPage(recorte.page + 1)}
          >
            Próxima
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </footer>
      )}
    </aside>
  );
}

/**
 * Entrega o recorte que está na tela, e não a base inteira.
 *
 * Quem exporta acabou de montar o recorte: entregar outra coisa obrigaria a
 * refazer o trabalho no Excel. Sai o filtrado inteiro e não só a página, que
 * é um detalhe de como a tela desenha.
 */
function exportar(tickets: Ticket[], ciclo: TicketCycle) {
  const csv = ticketsToCsv(tickets, defaultTicketColumns, ciclo);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));

  const link = document.createElement("a");
  link.href = url;
  link.download = "atendimentos.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function TicketRow({
  ticket,
  ciclo,
  selected,
  onSelect,
}: {
  ticket: Ticket;
  ciclo: TicketCycle;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const etapa = ticketStage(ticket, ciclo);

  return (
    <button
      onClick={() => onSelect(ticket.id)}
      className={`w-full border-b border-border/60 px-4 py-4 text-left transition-colors last:border-b-0 ${
        selected ? "bg-primary/8" : "hover:bg-muted/45"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={`line-clamp-2 text-sm leading-5 ${selected ? "font-semibold" : "font-medium"}`}
          >
            {ticket.title}
          </h3>

          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {ticket.company.trim() !== "" && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate">{ticket.company}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge variant={etapa === "publicado" ? "default" : "outline"} className="text-[10px]">
            {ticketStageLabel[etapa]}
          </Badge>
        </div>
      </div>
    </button>
  );
}
