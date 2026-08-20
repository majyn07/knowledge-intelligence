"use client";

import { ChevronDown, ChevronUp, Info, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  panelBreakdownLabel,
  panelSourceLabel,
  panelWindowLabel,
  type PanelSpec,
} from "../panelSpec";
import type { PanelResult } from "../runPanel";

interface PanelCardProps {
  spec: PanelSpec;
  result: PanelResult;
  onEdit: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}

/** A legenda do painel: o que ele conta, como quebra e em que janela. */
function subtitle(spec: PanelSpec): string {
  const partes = [panelSourceLabel[spec.source], panelWindowLabel(spec.window)];

  if (spec.breakdown !== "none") partes.push(panelBreakdownLabel[spec.breakdown].toLowerCase());
  if (spec.scopedToProject) partes.push("só o projeto ativo");

  return partes.join(" · ");
}

function Bars({ rows }: { rows: PanelResult["rows"] }) {
  const peak = Math.max(1, ...rows.map((row) => row.value));

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.key}>
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm">{row.label}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">{row.value}</span>
          </span>

          <span className="mt-1.5 block h-2 rounded-full bg-muted" role="presentation">
            <span
              className="block h-2 rounded-full bg-primary transition-all"
              style={{ width: `${(row.value / peak) * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Table({ rows, total }: { rows: PanelResult["rows"]; total: number }) {
  return (
    /*
      A tabela rola dentro do cartão. Deixar a página rolar na horizontal por
      causa de uma seção do portal com nome longo quebraria o resto da tela.
    */
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[18rem] text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border/60 last:border-0">
              <td className="py-1.5 pr-3">{row.label}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">{row.value}</td>
              <td className="w-14 py-1.5 text-right text-xs text-muted-foreground tabular-nums">
                {total > 0 ? `${Math.round((row.value / total) * 100)}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PanelCard({
  spec,
  result,
  onEdit,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: PanelCardProps) {
  const vazio = result.total === 0;

  return (
    <article className="flex flex-col rounded-xl border border-border/70 bg-card p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-tight">{spec.title}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle(spec)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label="Mover para cima"
            disabled={isFirst}
            onClick={() => onMove(-1)}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label="Mover para baixo"
            disabled={isLast}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label={`Editar ${spec.title}`}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label={`Remover ${spec.title}`}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <div className="mt-4 flex-1">
        {vazio ? (
          /*
            Estado vazio honesto em vez de um zero grande: "nada neste recorte"
            e "nada existe" são coisas diferentes, e o painel não sabe qual das
            duas é sem que alguém olhe o recorte.
          */
          <p className="text-sm text-muted-foreground">
            Nada neste recorte. Amplie a janela ou tire o filtro de projeto para
            conferir se existe fora dele.
          </p>
        ) : spec.visual === "number" ? (
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{result.total}</p>
        ) : spec.visual === "bar" ? (
          <Bars rows={result.rows} />
        ) : (
          <Table rows={result.rows} total={result.total} />
        )}
      </div>

      {spec.visual !== "number" && !vazio && (
        <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          Total: <strong className="tabular-nums">{result.total}</strong>
        </p>
      )}

      {/*
        Ressalva não é rodapé decorativo: quem lê precisa saber que o número é
        parcial antes de usá-lo, e não depois.
      */}
      {result.caveat && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--ring)] bg-accent p-2.5 text-xs">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{result.caveat}</span>
        </p>
      )}
    </article>
  );
}
