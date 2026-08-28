"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FileUp, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { sectionPath } from "@/models/Taxonomy";
import { articleStatusLabel, type ArticleStatus, type ContentFormat } from "@/models/KnowledgeArticle";

import { useLibrary } from "../providers/LibraryProvider";
import { columnSample, parseDelimited, type DelimitedTable } from "@/lib/delimited";
import { buildImportPlan, type ImportPlan } from "../import/importPlan";
import {
  guessMapping,
  importFieldLabel,
  IMPORT_FIELDS,
  mappingIsComplete,
  type ColumnMapping,
  type ImportField,
} from "../import/mapping";
import { LibraryDialog } from "./LibraryDialog";

const NAO_IMPORTAR = "__nenhuma__";

/**
 * Trazer o acervo publicado para dentro, por arquivo.
 *
 * O portal tem mil e oitocentos artigos e a Biblioteca tem quatro, então toda
 * medida de cobertura documental hoje mede um acervo que não existe. A
 * exportação da HubSpot é um arquivo, e um arquivo não precisa de rede, de
 * credencial nem de autorização de ninguém.
 *
 * **O mapeamento é uma tela, não uma adivinhação.** As colunas da exportação
 * não usam os nossos nomes; o que dá para reconhecer vem sugerido, e o resto
 * fica em branco para alguém escolher. Encaixar por semelhança erraria em
 * silêncio, e erro de mapeamento contamina mil e oitocentos registros de uma
 * vez, que ninguém revisa um por um para descobrir.
 *
 * O plano é calculado antes de gravar e mostrado inteiro: quantos entram,
 * quantos atualizam, quantos ficam sem seção. É a mesma regra do diálogo de
 * exclusão, que diz o número antes do clique.
 */
export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { taxonomy } = useTaxonomy();
  const { items, importArticles } = useLibrary();

  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<DelimitedTable | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [contentFormat, setContentFormat] = useState<ContentFormat>("html");
  const [defaultStatus, setDefaultStatus] = useState<ArticleStatus>("published");
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
      const text = await file.text();
      const parsed = parseDelimited(text);

      if (parsed.headers.length === 0) {
        setReadError("O arquivo está vazio ou não tem cabeçalho.");
        return;
      }

      setFileName(file.name);
      setTable(parsed);
      setMapping(guessMapping(parsed.headers));
    } catch (error) {
      setReadError(
        `Não foi possível ler o arquivo: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
    }
  }

  /*
    Recalculado a cada troca de mapeamento. É isso que faz a contagem embaixo
    responder enquanto a pessoa escolhe, em vez de só depois de confirmar.
  */
  const plan: ImportPlan | null = useMemo(() => {
    if (!table || !mapping || !mappingIsComplete(mapping)) return null;

    return buildImportPlan(table, mapping, taxonomy, items, {
      /*
        Sem iniciativa: o artigo do portal já existia antes de qualquer esforço
        nosso. Carimbar o projeto ativo faria mil e oitocentos registros
        pertencerem a um trabalho que não os originou.
      */
      projectId: "",
      contentFormat,
      defaultStatus,
      now: new Date(),
    });
  }, [table, mapping, taxonomy, items, contentFormat, defaultStatus]);

  function confirm() {
    if (!plan) return;

    importArticles(plan.create, plan.update);
    reset();
    onOpenChange(false);
  }

  function setField(field: ImportField, value: string) {
    setMapping((current) =>
      current === null
        ? current
        : { ...current, [field]: value === NAO_IMPORTAR ? null : Number(value) }
    );
  }

  const total = plan ? plan.create.length + plan.update.length : 0;
  const primeiro = plan ? plan.create[0] ?? plan.update[0] : undefined;

  return (
    <LibraryDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Importar artigos de um arquivo"
      description="A exportação do portal, em CSV ou texto separado. Nada sai daqui e nada é enviado a lugar nenhum: o arquivo é lido no seu navegador. Para um artigo só, a partir de PDF, imagem ou texto, use “Novo artigo”, lá a IA lê o documento e propõe os campos."
    >
      <div className="flex flex-col gap-5">
        <div>
          <Label htmlFor="import-file">Arquivo</Label>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              id="import-file"
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain"
              onChange={(event) => void receive(event.target.files?.[0])}
              className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
            />

            {table && (
              <span className="text-xs text-muted-foreground">
                {fileName} · {table.rows.length} linha(s) ·{" "}
                separador {table.delimiter === "\t" ? "tabulação" : `"${table.delimiter}"`}
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
          <>
            <div>
              <h3 className="text-sm font-medium">De onde vem cada campo</h3>

              <p className="mt-1 text-xs text-muted-foreground">
                O que foi reconhecido já veio preenchido. O que não foi ficou em branco de
                propósito, encaixar no mais parecido erraria em {table.rows.length} registros de
                uma vez. Abaixo de cada escolha está <strong>o que aquela coluna guarda de
                verdade</strong>, para não ser preciso conhecer o formato do arquivo.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {IMPORT_FIELDS.map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={`map-${field}`} className="text-xs">
                      {importFieldLabel[field]}
                      {field === "title" && " *"}
                    </Label>

                    <Select
                      value={mapping[field] === null ? NAO_IMPORTAR : String(mapping[field])}
                      onValueChange={(value) => setField(field, value ?? NAO_IMPORTAR)}
                    >
                      <SelectTrigger id={`map-${field}`}>
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="import-format" className="text-xs">
                  Formato do conteúdo
                </Label>

                <Select
                  value={contentFormat}
                  onValueChange={(value) => setContentFormat((value as ContentFormat) ?? "html")}
                >
                  <SelectTrigger id="import-format">
                    <SelectValue>
                      {(value: string) => (value === "html" ? "HTML" : "Markdown")}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="html">HTML. Vem do portal</SelectItem>
                    <SelectItem value="markdown">Markdown. Escrito aqui</SelectItem>
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">
                  Declarado, nunca adivinhado: converter nos dois sentidos degrada a cada ida e
                  volta.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="import-status" className="text-xs">
                  Estágio de quem chega sem coluna de estágio
                </Label>

                <Select
                  value={defaultStatus}
                  onValueChange={(value) => setDefaultStatus((value as ArticleStatus) ?? "draft")}
                >
                  <SelectTrigger id="import-status">
                    <SelectValue>
                      {(value: string) => articleStatusLabel[value as ArticleStatus]}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="review">Em revisão</SelectItem>
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">
                  Publicado conta como cobertura documental na hora, sem ninguém revisar.
                </p>
              </div>
            </div>
          </>
        )}

        {plan && (
          <div className="rounded-xl border bg-muted/40 p-4">
            <h3 className="text-sm font-medium">O que vai acontecer</h3>

            <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">{plan.create.length}</strong> artigo(s) novo(s).
              </li>

              <li>
                <strong className="text-foreground">{plan.update.length}</strong> atualizado(s),
                casados pelo identificador do portal.
              </li>
            </ul>

            {(plan.withoutSection > 0 ||
              plan.skippedNoTitle > 0 ||
              plan.duplicatedInFile > 0 ||
              plan.unreadableDate > 0 ||
              plan.unusedColumns.length > 0) && (
              <div className="mt-3 flex items-start gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />

                <ul className="flex flex-col gap-1">
                  {plan.withoutSection > 0 && (
                    <li>
                      {plan.withoutSection} entra(m) <strong>sem seção</strong>, porque o nome não
                      existe no cadastro. Aparecem no filtro &ldquo;Sem seção&rdquo; para alguém
                      classificar.
                    </li>
                  )}

                  {plan.skippedNoTitle > 0 && (
                    <li>{plan.skippedNoTitle} linha(s) sem título ficam de fora.</li>
                  )}

                  {plan.duplicatedInFile > 0 && (
                    <li>
                      {plan.duplicatedInFile} repetida(s) dentro do arquivo. Vale a última
                      ocorrência.
                    </li>
                  )}

                  {plan.unreadableDate > 0 && (
                    <li>
                      {plan.unreadableDate} com data ilegível recebe(m) a data de hoje, em vez de
                      uma data chutada.
                    </li>
                  )}

                  {plan.unusedColumns.length > 0 && (
                    <li>
                      Nenhum campo lê: {plan.unusedColumns.join(", ")}.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/*
          A conferência que dispensa conhecer o formato: um registro montado,
          com os nomes dos nossos campos. Contagem certa com mapeamento trocado
          é possível. Mil e oitocentos resumos no lugar do título somam mil e
          oitocentos do mesmo jeito. Ver um pronto é o que denuncia.
        */}
        {primeiro && (
          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-medium">O primeiro registro, como vai ficar</h3>

            <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Título</dt>
              <dd className="truncate">{primeiro.title}</dd>

              <dt className="text-muted-foreground">Resumo</dt>
              <dd className="truncate">{primeiro.summary || "."}</dd>

              <dt className="text-muted-foreground">Conteúdo</dt>
              <dd className="truncate">
                {primeiro.content
                  ? `${primeiro.content.replace(/\s+/g, " ").slice(0, 80)}${
                      primeiro.content.length > 80 ? "…" : ""
                    }`
                  : "."}
              </dd>

              <dt className="text-muted-foreground">Seção</dt>
              <dd className="truncate">
                {primeiro.sectionId
                  ? sectionPath(taxonomy, primeiro.sectionId)
                  : "Sem seção. Para classificar depois"}
              </dd>

              <dt className="text-muted-foreground">Estágio</dt>
              <dd>{articleStatusLabel[primeiro.status]}</dd>

              <dt className="text-muted-foreground">Identificador no portal</dt>
              <dd className="truncate">{primeiro.portalArticleId || "."}</dd>
            </dl>
          </div>
        )}

        {table && mapping && !mappingIsComplete(mapping) && (
          <p className="text-sm text-muted-foreground">
            Escolha a coluna do <strong>título</strong> para continuar, sem ela a linha não
            identifica registro nenhum.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button onClick={confirm} disabled={!plan || total === 0}>
            <Upload className="mr-1.5 h-4 w-4" />
            {total > 0 ? `Importar ${total} artigo(s)` : "Importar"}
          </Button>
        </div>
      </div>
    </LibraryDialog>
  );
}

/** Botão que abre a importação, para a barra da Biblioteca. */
export function ImportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick}>
      <FileUp className="mr-1.5 h-4 w-4" />
      Importar
    </Button>
  );
}
