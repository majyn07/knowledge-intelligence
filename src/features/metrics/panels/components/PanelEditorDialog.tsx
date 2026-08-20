"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  PANEL_SOURCES,
  PANEL_STAGES,
  PANEL_VISUALS,
  PANEL_WINDOWS,
  allowedBreakdowns,
  panelBreakdownLabel,
  panelSourceHint,
  panelSourceLabel,
  panelVisualLabel,
  panelWindowLabel,
  reconcileSpec,
  type PanelSource,
  type PanelSpec,
  type PanelVisual,
  type PanelWindow,
} from "../panelSpec";

interface PanelEditorDialogProps {
  /** O painel em edição, ou `null` para um novo. */
  spec: PanelSpec | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (spec: PanelSpec) => void;
}

/** `null` é janela legítima, então a chave do seletor precisa ser texto. */
const windowKey = (days: PanelWindow) => (days === null ? "all" : String(days));

function parseWindowKey(key: string): PanelWindow {
  if (key === "all") return null;

  const days = Number(key);
  return (PANEL_WINDOWS as readonly (number | null)[]).includes(days)
    ? (days as PanelWindow)
    : 30;
}

function novoPainel(): PanelSpec {
  return {
    id: crypto.randomUUID(),
    title: "",
    source: "articles",
    breakdown: "none",
    visual: "number",
    window: 30,
    scopedToProject: false,
    order: 0,
  };
}

/**
 * O construtor.
 *
 * Cada troca passa por `reconcileSpec` na hora, e não só ao salvar: trocar a
 * origem para uma que não responde a quebra escolhida corrige a quebra na
 * frente de quem edita, em vez de aceitar em silêncio e mostrar um painel
 * vazio depois.
 *
 * O estado nasce do prop e não é sincronizado depois — quem abre remonta o
 * componente com `key`, como todo formulário deste produto.
 */
export function PanelEditorDialog({ spec, open, onOpenChange, onSave }: PanelEditorDialogProps) {
  const [form, setForm] = useState<PanelSpec>(spec ?? novoPainel());

  const patch = (changes: Partial<PanelSpec>) =>
    setForm((current) => reconcileSpec({ ...current, ...changes }));

  const breakdowns = allowedBreakdowns[form.source];

  /*
    A segunda quebra não pode repetir a primeira: cruzar algo consigo mesmo
    produziria uma diagonal, com uma coluna útil e o resto zerado.
  */
  const cruzamentos = breakdowns.filter(
    (breakdown) => breakdown === "none" || breakdown !== form.breakdown
  );

  const submit = () => {
    onSave(reconcileSpec({ ...form, title: form.title.trim() || "Painel sem título" }));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{spec ? "Editar painel" : "Novo painel"}</DialogTitle>

          <DialogDescription>
            O painel guarda a pergunta, não a resposta: o número é recalculado a
            cada abertura, sobre os dados que existem agora.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="panel-title">Título</Label>

            <Input
              id="panel-title"
              value={form.title}
              placeholder="Artigos publicados por mês"
              onChange={(event) => patch({ title: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="panel-source">O que contar</Label>

            <Select
              value={form.source}
              onValueChange={(value) => patch({ source: (value ?? "articles") as PanelSource })}
            >
              <SelectTrigger id="panel-source">
                {/* O gatilho mostra o rótulo, não a chave: sem isto lia-se "arrivals". */}
                <SelectValue>{(value: PanelSource) => panelSourceLabel[value]}</SelectValue>
              </SelectTrigger>

              <SelectContent>
                {PANEL_SOURCES.map((source) => (
                  <SelectItem key={source} value={source}>
                    {panelSourceLabel[source]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground">{panelSourceHint[form.source]}</p>
          </div>

          {form.source === "arrivals" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="panel-stage">A qual estágio</Label>

              <Select value={form.stage ?? "published"} onValueChange={(value) => patch({ stage: value ?? "published" })}>
                <SelectTrigger id="panel-stage">
                  <SelectValue>
                    {(value: string) =>
                      PANEL_STAGES.find((item) => item.stage === value)?.label ?? value
                    }
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {PANEL_STAGES.map((item) => (
                    <SelectItem key={item.stage} value={item.stage}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="panel-breakdown">Como quebrar</Label>

            <Select
              value={form.breakdown}
              onValueChange={(value) => patch({ breakdown: (value ?? "none") as PanelSpec["breakdown"] })}
            >
              <SelectTrigger id="panel-breakdown">
                <SelectValue>
                  {(value: PanelSpec["breakdown"]) => panelBreakdownLabel[value]}
                </SelectValue>
              </SelectTrigger>

              {/*
                A lista muda com a origem: quebrar atendimento por gênero de
                artigo produziria uma coluna vazia com cara de dado.
              */}
              <SelectContent>
                {breakdowns.map((breakdown) => (
                  <SelectItem key={breakdown} value={breakdown}>
                    {panelBreakdownLabel[breakdown]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.breakdown !== "none" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="panel-breakdown-2">Cruzar com</Label>

              <Select
                value={form.breakdown2 ?? "none"}
                onValueChange={(value) =>
                  patch({
                    breakdown2: (value ?? "none") as PanelSpec["breakdown"],
                  })
                }
              >
                <SelectTrigger id="panel-breakdown-2">
                  <SelectValue>
                    {(value: PanelSpec["breakdown"]) => panelBreakdownLabel[value]}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {cruzamentos.map((breakdown) => (
                    <SelectItem key={breakdown} value={breakdown}>
                      {breakdown === "none" ? "Não cruzar" : panelBreakdownLabel[breakdown]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">
                Cruzar produz uma tabela. Para em duas dimensões: três não cabem
                numa tabela que se lê de relance.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="panel-window">Janela</Label>

              <Select
                value={windowKey(form.window)}
                onValueChange={(value) => patch({ window: parseWindowKey(value ?? "30") })}
              >
                <SelectTrigger id="panel-window">
                  <SelectValue>
                    {(value: string) => panelWindowLabel(parseWindowKey(value))}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {PANEL_WINDOWS.map((days) => (
                    <SelectItem key={windowKey(days)} value={windowKey(days)}>
                      {panelWindowLabel(days)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="panel-visual">Visualização</Label>

              <Select
                value={form.visual}
                onValueChange={(value) => patch({ visual: (value ?? "number") as PanelVisual })}
              >
                <SelectTrigger id="panel-visual">
                  <SelectValue>{(value: PanelVisual) => panelVisualLabel[value]}</SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {PANEL_VISUALS.map((visual) => (
                    <SelectItem
                      key={visual}
                      value={visual}
                      // Número único não comporta quebra: seria um número por
                      // linha, sem linha.
                      /*
                        Com cruzamento só a tabela serve — barra empilhada
                        esconderia metade dos números. Sem ele, número único
                        não comporta quebra: seria um número por linha, sem
                        linha.
                      */
                      disabled={
                        form.breakdown2
                          ? visual !== "table"
                          : visual === "number" && form.breakdown !== "none"
                      }
                    >
                      {panelVisualLabel[visual]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-border/70 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
              checked={form.scopedToProject}
              onChange={(event) => patch({ scopedToProject: event.target.checked })}
            />

            <span className="text-sm">
              Somente o projeto ativo
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Sem isto, o painel conta todos os projetos — inclusive os que não
                estão selecionados no cabeçalho.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button onClick={submit}>{spec ? "Salvar" : "Criar painel"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
