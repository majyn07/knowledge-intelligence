"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleHelp, Paperclip, Sparkles, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFieldFill, type FillResult } from "@/hooks/useFieldFill";
import { MAX_ATTACHMENT_BYTES, type AttachmentType } from "@/models/AIAttachment";
import type { FieldSpec } from "@/services/ai/fill/fieldFill";

import {
  applySelection,
  defaultSelection,
  toReviewable,
  type FillValue,
  type ReviewableProposal,
} from "./fillSelection";
import {
  attachmentTooLarge,
  classifyFile,
  FILE_ACCEPT,
  humanSize,
  readFileForFill,
} from "./fileSource";

/** O anexo em memória, enquanto a pessoa não pede a leitura. */
interface Anexo {
  name: string;
  size: number;
  mimeType: AttachmentType;
  data: string;
}

/**
 * "Descreva, e a IA propõe os campos."
 *
 * A peça é a mesma em qualquer formulário do produto: quem usa diz o que o
 * formulário é e quais campos existem, e recebe proposta revisável. Nada aqui
 * grava: a IA propõe, a revisão aprova, e salvar continua sendo ato de quem
 * edita.
 *
 * O que a IA **não** conseguiu preencher aparece como pergunta, e isso é
 * metade do valor: um preenchimento que chuta o que não sabe obriga a conferir
 * todos os campos, o que custa mais que digitar todos. A lacuna admitida é o
 * que faz a proposta valer a pena.
 */

interface FillPanelProps {
  /** O que o formulário é, em uma frase. Ancora o modelo no domínio. */
  subject: string;
  fields: FieldSpec[];
  /** O que o formulário mostra hoje, para saber o que seria substituído. */
  current: Record<string, FillValue>;
  onApply: (values: Record<string, FillValue>) => void;
  placeholder?: string;
}

/** O teto do schema da rota. Cortar aqui evita uma ida ao servidor para nada. */
const MAX_SOURCE = 60_000;

export function FillPanel({
  subject,
  fields,
  current,
  onApply,
  placeholder = "Descreva o que você precisa, com as suas palavras.",
}: FillPanelProps) {
  const [source, setSource] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [fileError, setFileError] = useState("");
  const { state, error, result, pedir, limpar } = useFieldFill();

  /**
   * O provedor ativo lê arquivo?
   *
   * Perguntado ao servidor porque qual provedor está valendo é informação
   * dele, e a resposta traz só a capacidade: a tela não precisa saber o nome
   * do modelo, e a fronteira existe para que não saiba.
   *
   * Começa em `false` e liga quando a resposta chega: oferecer o anexo antes
   * de saber faria o botão aparecer e sumir na abertura da tela. Ambiente sem
   * IA nenhuma simplesmente não mostra o anexo, sem erro nenhum: o produto
   * roda sem provedor, e sempre rodou.
   */
  const [readsFiles, setReadsFiles] = useState(false);

  useEffect(() => {
    let vivo = true;

    fetch("/api/fill")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { readsFiles?: boolean } | null) => {
        if (vivo && body?.readsFiles) setReadsFiles(true);
      })
      .catch(() => {
        /* Sem resposta, o anexo fica escondido. Silêncio aqui é o padrão seguro. */
      });

    return () => {
      vivo = false;
    };
  }, []);

  const labels = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.name, field.label])),
    [fields]
  );

  /*
    As propostas são cruzadas com o formulário na hora de exibir, e não na hora
    de receber: o que está digitado muda enquanto a lista está na tela, e o
    aviso de substituição precisa falar do estado de agora.
  */
  const revisaveis: ReviewableProposal[] = useMemo(
    () => (result ? toReviewable(result.fields, labels, current) : []),
    [result, labels, current]
  );

  /*
    A marcação inicial é calculada **uma vez por resposta**, e o `result` é a
    chave disso: recalcular a cada render desfaria o que a pessoa desmarcou no
    render anterior.

    É o ajuste de estado durante o render que o React documenta, e não um
    efeito: um `useEffect` pintaria a lista uma vez com a marcação errada
    antes de corrigir, e a correção seria visível.
  */
  const [marcadoPara, setMarcadoPara] = useState<FillResult | null>(null);

  if (result && marcadoPara !== result) {
    setMarcadoPara(result);
    setSelected(defaultSelection(revisaveis));
  }

  /**
   * Recebe o arquivo escolhido e decide o caminho dele.
   *
   * Texto entra no campo de descrição, à vista: quem anexou um `.csv` precisa
   * poder conferir e corrigir o que vai ser lido, e escondê-lo faria a tela
   * mandar ao modelo algo que ninguém viu. PDF e imagem ficam como anexo
   * nomeado, porque não há como mostrá-los num campo de texto.
   */
  async function receber(file: File | undefined) {
    setFileError("");
    if (!file) return;

    const verdict = classifyFile(file.name, file.type);

    if (!verdict) {
      setFileError(
        `“${file.name}” não é um formato que a IA consegue ler aqui. Valem PDF, imagem e arquivos de texto.`
      );
      return;
    }

    if (verdict.role === "anexo" && attachmentTooLarge(file.size)) {
      setFileError(
        `“${file.name}” tem ${humanSize(file.size)} e o limite é ${humanSize(
          MAX_ATTACHMENT_BYTES
        )}.`
      );
      return;
    }

    try {
      const lido = await readFileForFill(file);
      if (!lido) return;

      if (lido.role === "texto") {
        setSource((previous) =>
          [previous.trim(), lido.text.trim()].filter(Boolean).join("\n\n").slice(0, MAX_SOURCE)
        );
        return;
      }

      setAnexo({ name: file.name, size: file.size, mimeType: lido.mimeType, data: lido.data });
    } catch {
      setFileError(`Não foi possível ler “${file.name}”.`);
    }
  }

  async function solicitar() {
    const texto = source.trim();
    if (texto === "" && !anexo) return;

    await pedir({
      subject,
      fields,
      source: texto.slice(0, MAX_SOURCE),
      ...(anexo ? { file: { mimeType: anexo.mimeType, data: anexo.data } } : {}),
    });
  }

  function alternar(name: string, ligado: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (ligado) next.add(name);
      else next.delete(name);
      return next;
    });
  }

  function aplicar() {
    onApply(applySelection(revisaveis, selected));
    limpar();
    setSource("");
    /*
      O anexo sai junto. Ele já cumpriu o papel, e mantê-lo faria o próximo
      pedido reenviar um documento que a pessoa acha que ficou para trás, e
      pagar os tokens dele de novo.
    */
    setAnexo(null);
    setFileError("");
    setMarcadoPara(null);
  }

  const pedindo = state === "pedindo";

  return (
    <section className="rounded-xl border border-border/70 bg-muted/30 p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Preencher com a IA</p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Escreva o que você precisa. A IA propõe os campos que o texto sustenta,
            deixa em branco o que não sustenta, e pergunta o resto. Nada é salvo sem
            você.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <Label htmlFor="fill-source" className="sr-only">
          O que você precisa
        </Label>

        <Textarea
          id="fill-source"
          rows={3}
          value={source}
          placeholder={placeholder}
          disabled={pedindo}
          onChange={(event) => setSource(event.target.value)}
        />

        {anexo && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />

            <span className="min-w-0 flex-1 truncate text-sm">{anexo.name}</span>

            <span className="shrink-0 text-xs text-muted-foreground">
              {humanSize(anexo.size)}
            </span>

            <button
              type="button"
              aria-label={`Remover ${anexo.name}`}
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
              onClick={() => setAnexo(null)}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        {fileError && (
          <p role="alert" className="text-sm text-destructive">
            {fileError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pedindo || (source.trim() === "" && !anexo)}
            onClick={() => void solicitar()}
          >
            {pedindo ? "Lendo…" : "Propor preenchimento"}
          </Button>

          {/*
            O arquivo entra pelo mesmo painel, e não por um diálogo à parte: o
            texto digitado e o documento anexado são a mesma coisa para quem
            preenche (contexto), e separá-los faria escolher entre descrever
            e anexar quando os dois juntos descrevem melhor.
          */}
          {readsFiles && (
            <label className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline">
              <Paperclip className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Anexar arquivo
              <input
                type="file"
                className="sr-only"
                accept={FILE_ACCEPT}
                disabled={pedindo}
                onChange={(event) => {
                  void receber(event.target.files?.[0]);
                  // Permite reescolher o mesmo arquivo depois de removê-lo.
                  event.target.value = "";
                }}
              />
            </label>
          )}

          {result && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                limpar();
                setMarcadoPara(null);
              }}
            >
              Descartar proposta
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {result && revisaveis.length === 0 && (
        /*
          Zero campos é resposta legítima, e precisa ser dita: sem isto a tela
          fica igual à de antes do pedido, e quem clicou não sabe se falhou.
        */
        <p className="mt-3 text-sm text-muted-foreground">
          O texto não sustentou nenhum campo. Detalhe mais, ou preencha à mão.
        </p>
      )}

      {revisaveis.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Proposta
          </h3>

          <ul className="mt-2 space-y-2">
            {revisaveis.map((proposal) => (
              <li
                key={proposal.name}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--primary)]"
                  checked={selected.has(proposal.name)}
                  aria-label={`Usar a proposta para ${proposal.label}`}
                  onChange={(event) => alternar(proposal.name, event.target.checked)}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {proposal.label}
                  </p>

                  {proposal.kind === "valor" ? (
                    <p className="mt-0.5 text-sm">{proposal.value}</p>
                  ) : (
                    /*
                      A lista aparece inteira, e não como "12 mensagens": quem
                      revisa precisa ver o que vai entrar antes de deixar
                      entrar, e uma contagem não é revisável.
                    */
                    <ul className="mt-1 space-y-1.5">
                      {proposal.items.map((item, indice) => (
                        <li key={indice} className="rounded border border-border/50 px-2 py-1.5">
                          {Object.entries(item).map(([coluna, valor]) => (
                            <p key={coluna} className="text-sm">
                              <span className="text-xs text-muted-foreground">{coluna}: </span>
                              {valor}
                            </p>
                          ))}
                        </li>
                      ))}
                    </ul>
                  )}

                  {proposal.reason && (
                    <p className="mt-1 text-xs text-muted-foreground">{proposal.reason}</p>
                  )}

                  {proposal.overwrites && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                      Substitui o que está escrito: “{proposal.current}”
                    </p>
                  )}

                  {/*
                    Lista soma, então isto informa e não alerta, cor neutra,
                    e não a de perda. A distinção importa: âmbar para o que
                    custa algo, cinza para o que só situa.
                  */}
                  {proposal.kind === "lista" && proposal.current !== "" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Soma ao que já está no formulário ({proposal.current}).
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={selected.size === 0}
            onClick={aplicar}
          >
            Usar {selected.size === 1 ? "o marcado" : `os ${selected.size} marcados`}
          </Button>
        </div>
      )}

      {result && result.questions.length > 0 && (
        <div className="mt-4 rounded-lg border border-border/60 bg-background p-3">
          <div className="flex items-center gap-2">
            <CircleHelp className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              O que falta
            </h3>
          </div>

          <ul className="mt-2 space-y-1">
            {result.questions.map((question) => (
              <li key={question} className="text-sm text-muted-foreground">
               . {question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
