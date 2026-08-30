"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FileUp, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/providers/PermissionsProvider";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { columnSample, parseDelimited, type DelimitedTable } from "@/lib/delimited";
import { formatDay } from "@/lib/dates";
import { useProject } from "@/providers/ProjectProvider";

import { useTickets } from "../providers/TicketsProvider";
import {
  buildTicketImportPlan,
  guessTicketMapping,
  ticketFieldLabel,
  ticketMappingIsComplete,
  TICKET_FIELDS,
  type TicketField,
  type TicketImportPlan,
  type TicketMapping,
} from "../import/ticketImport";

const NAO_IMPORTAR = "__nenhuma__";

/**
 * Atendimentos por arquivo.
 *
 * O atendimento é a entrada do ciclo e era digitado um a um. Se a HubSpot
 * exporta, não há razão para redigitar, e sem volume o Levantamento não tem o
 * que apontar: o achado mais grave dele é "atendimento resolvido e nenhum
 * artigo nasceu dele".
 *
 * As regras são as mesmas da importação de artigos, e a repetição é
 * deliberada: reconhecimento exato do cabeçalho, valor de exemplo em cada
 * coluna, o primeiro registro montado, e o plano inteiro antes do clique.
 */
export function TicketImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { tickets, importTickets } = useTickets();
  const { activeProject } = useProject();

  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<DelimitedTable | null>(null);
  const [mapping, setMapping] = useState<TicketMapping | null>(null);
  const [readError, setReadError] = useState("");

  function reset() {
    setFileName("");
    setTable(null);
    setMapping(null);
    setReadError("");
  }

  async function receive(file: File | undefined) {
    if (!file) return;

    setReadError("");

    try {
      const parsed = parseDelimited(await file.text());

      if (parsed.headers.length === 0) {
        setReadError("O arquivo está vazio ou não tem cabeçalho.");
        return;
      }

      setFileName(file.name);
      setTable(parsed);
      setMapping(guessTicketMapping(parsed.headers));
    } catch (error) {
      setReadError(
        `Não foi possível ler o arquivo: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
    }
  }

  const plan: TicketImportPlan | null = useMemo(() => {
    if (!table || !mapping || !ticketMappingIsComplete(mapping)) return null;

    return buildTicketImportPlan(table, mapping, tickets, {
      /*
        Aqui a iniciativa faz sentido, ao contrário do artigo: o atendimento é
        trabalho datado, e é ele que alimenta o esforço de melhoria em curso.
      */
      projectId: activeProject?.id ?? "",
      now: new Date(),
    });
  }, [table, mapping, tickets, activeProject]);

  function setField(field: TicketField, value: string) {
    setMapping((current) =>
      current === null
        ? current
        : { ...current, [field]: value === NAO_IMPORTAR ? null : Number(value) }
    );
  }

  const total = plan ? plan.create.length + plan.update.length : 0;
  const primeiro = plan ? plan.create[0] ?? plan.update[0] : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar atendimentos de um arquivo</DialogTitle>

          <DialogDescription>
            A exportação da HubSpot, em CSV. O arquivo é lido no seu navegador, nada é enviado
            para lugar nenhum.
            {/*
              O caminho do documento único é dito aqui porque é aqui que a
              pessoa chega com ele na mão. Sem isso, quem tem um PDF de um
              atendimento tenta convertê-lo em planilha, que é trabalho
              inventado por falta de uma frase.
            */}{" "}
            Para <strong>um</strong> atendimento em PDF, imagem ou texto, use “Novo atendimento”:
            lá a IA lê o documento e propõe os campos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-2">
          <div>
            <Label htmlFor="ticket-import-file">Arquivo</Label>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                id="ticket-import-file"
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/plain"
                onChange={(event) => void receive(event.target.files?.[0])}
                className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
              />

              {table && (
                <span className="text-xs text-muted-foreground">
                  {fileName} · {table.rows.length} linha(s)
                </span>
              )}
            </div>

            {readError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {readError}
              </p>
            )}
          </div>

          {table && mapping && (
            <div>
              <h3 className="text-sm font-medium">De onde vem cada campo</h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Abaixo de cada escolha está o que aquela coluna guarda de verdade: o cabeçalho
                da exportação raramente diz.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {TICKET_FIELDS.map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={`tmap-${field}`} className="text-xs">
                      {ticketFieldLabel[field]}
                      {field === "title" && " *"}
                    </Label>

                    <Select
                      value={mapping[field] === null ? NAO_IMPORTAR : String(mapping[field])}
                      onValueChange={(value) => setField(field, value ?? NAO_IMPORTAR)}
                    >
                      <SelectTrigger id={`tmap-${field}`}>
                        <SelectValue>
                          {(value: string) =>
                            value === NAO_IMPORTAR
                              ? "Não importar"
                              : table.headers[Number(value)] ?? "Não importar"
                          }
                        </SelectValue>
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value={NAO_IMPORTAR}>Não importar</SelectItem>

                        {table.headers.map((header, index) => (
                          <SelectItem key={`${header}-${index}`} value={String(index)}>
                            {header || `Coluna ${index + 1}`}
                            {columnSample(table, index, 32) &&
                              `. ${columnSample(table, index, 32)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {mapping[field] !== null && (
                      <p className="truncate text-xs text-muted-foreground">
                        {columnSample(table, mapping[field]) || "Coluna vazia neste arquivo."}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan && (
            <div className="rounded-xl border bg-muted/40 p-4">
              <h3 className="text-sm font-medium">O que vai acontecer</h3>

              <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">{plan.create.length}</strong> atendimento(s)
                  novo(s)
                  {activeProject ? ` em ${activeProject.name}` : " sem iniciativa"}.
                </li>

                <li>
                  <strong className="text-foreground">{plan.update.length}</strong> atualizado(s),
                  casados pelo identificador da HubSpot.
                </li>
              </ul>

              {(plan.withoutSolution > 0 ||
                plan.unreadableDate > 0 ||
                plan.skippedNoTitle > 0 ||
                plan.duplicatedInFile > 0 ||
                plan.unusedColumns.length > 0) && (
                <div className="mt-3 flex items-start gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />

                  <ul className="flex flex-col gap-1">
                    {plan.withoutSolution > 0 && (
                      <li>
                        {plan.withoutSolution} sem solução registrada. Eles entram, mas o
                        Levantamento não os cobra como candidatos a virar artigo.
                      </li>
                    )}

                    {plan.unreadableDate > 0 && (
                      <li>
                        {plan.unreadableDate} com data ilegível entram sem data, em vez de com uma
                        data chutada, e ficam fora das janelas dos painéis.
                      </li>
                    )}

                    {plan.skippedNoTitle > 0 && (
                      <li>{plan.skippedNoTitle} linha(s) sem assunto ficam de fora.</li>
                    )}

                    {plan.duplicatedInFile > 0 && (
                      <li>
                        {plan.duplicatedInFile} repetida(s) no arquivo. Vale a última ocorrência.
                      </li>
                    )}

                    {plan.unusedColumns.length > 0 && (
                      <li>Nenhum campo lê: {plan.unusedColumns.join(", ")}.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {primeiro && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-medium">O primeiro registro, como vai ficar</h3>

              <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-[8rem_1fr]">
                <dt className="text-muted-foreground">Assunto</dt>
                <dd className="truncate">{primeiro.title}</dd>

                <dt className="text-muted-foreground">Solução</dt>
                <dd className="truncate">{primeiro.solution || "."}</dd>

                <dt className="text-muted-foreground">Empresa</dt>
                <dd className="truncate">{primeiro.company || "."}</dd>

                <dt className="text-muted-foreground">Data</dt>
                <dd>{primeiro.date ? formatDay(primeiro.date) : "sem data"}</dd>

                <dt className="text-muted-foreground">Identificador</dt>
                <dd className="truncate">{primeiro.source?.externalId ?? "."}</dd>
              </dl>
            </div>
          )}

          {table && mapping && !ticketMappingIsComplete(mapping) && (
            <p className="text-sm text-muted-foreground">
              Escolha a coluna do <strong>assunto</strong> para continuar, sem ela a linha não
              identifica atendimento nenhum.
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>

            <Button
              onClick={() => {
                if (!plan) return;
                importTickets(plan.create, plan.update);
                reset();
                onOpenChange(false);
              }}
              disabled={!plan || total === 0}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {total > 0 ? `Importar ${total} atendimento(s)` : "Importar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Botão que abre a importação.
 *
 * Some quando a ação está restrita: um clique reescreve milhares de registros,
 * e o plano é mostrado antes mas o desfazer não existe. Esconder não é a trava
 * — a regra fica escrita em Configurações, para quem procura o botão que sumiu.
 */
export function TicketImportButton({ onClick }: { onClick: () => void }) {
  const { pode } = usePermissions();

  if (!pode("importarArquivo")) return null;

  return (
    <Button variant="outline" onClick={onClick}>
      <FileUp className="mr-1.5 h-4 w-4" />
      Importar
    </Button>
  );
}
