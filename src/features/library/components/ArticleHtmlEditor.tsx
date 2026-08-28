"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Code,
  Eraser,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  Undo2,
  Unlink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Editor do artigo em HTML.
 *
 * Edita **no próprio HTML renderizado**, e devolve o que está no documento.
 * Isso é o oposto de um editor de esquema — TipTap, ProseMirror — que
 * reserializa tudo para o formato que entende: o artigo do portal tem estilo em
 * atributo, classe da HubSpot e `srcset` nas imagens, e nada disso sobreviveria
 * à ida e volta. Aqui o que ninguém tocar continua idêntico.
 *
 * O preço é usar `document.execCommand`, que está obsoleto na especificação e
 * funciona em todo navegador que importa. A troca está declarada: fidelidade do
 * conteúdo vale mais que pureza de API, porque o conteúdo é da AltoQi e a API é
 * detalhe nosso.
 *
 * **Não publica no portal.** Editar aqui altera o acervo; lançar de volta na
 * HubSpot é decisão de outra ordem e fica para a sprint ProjetoAprovado.
 */

type Modo = "rico" | "fonte";

interface ArticleHtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Muda quando o registro em edição muda, para o editor recomeçar. */
  resetKey?: string;
}

function comando(nome: string, argumento?: string) {
  /*
    Obsoleto e insubstituível: a alternativa seria manipular a seleção à mão,
    o que é a metade difícil de escrever um editor.
  */
  document.execCommand(nome, false, argumento);
}

function BotaoDaBarra({
  titulo,
  onClick,
  children,
}: {
  titulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-7 w-7"
      title={titulo}
      aria-label={titulo}
      /*
        `onMouseDown` com `preventDefault` em vez de `onClick`: sem isto o botão
        rouba o foco e a seleção do texto se perde antes de o comando rodar.
      */
      onMouseDown={(evento) => {
        evento.preventDefault();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

export function ArticleHtmlEditor({ value, onChange, resetKey }: ArticleHtmlEditorProps) {
  const [modo, setModo] = useState<Modo>("rico");
  const corpoRef = useRef<HTMLDivElement>(null);

  /*
    O conteúdo entra uma vez, não a cada render. Reescrever `innerHTML` enquanto
    alguém digita joga o cursor para o começo a cada tecla — é o mesmo motivo de
    o formulário nascer do prop e não sincronizar depois.
  */
  useEffect(() => {
    if (modo !== "rico") return;
    const corpo = corpoRef.current;
    if (corpo && corpo.innerHTML !== value) corpo.innerHTML = value;
    // `value` fica de fora de propósito: só recomeça ao trocar de registro ou de modo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, modo]);

  const capturar = useCallback(() => {
    const corpo = corpoRef.current;
    if (corpo) onChange(corpo.innerHTML);
  }, [onChange]);

  function aplicar(nome: string, argumento?: string) {
    comando(nome, argumento);
    capturar();
  }

  function inserirLink() {
    const endereco = window.prompt("Endereço do link");
    if (endereco) aplicar("createLink", endereco);
  }

  return (
    <div className="rounded-lg border border-input">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input px-2 py-1.5">
        <BotaoDaBarra titulo="Negrito" onClick={() => aplicar("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <BotaoDaBarra titulo="Itálico" onClick={() => aplicar("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <span className="mx-1 h-4 w-px bg-border" />

        <BotaoDaBarra titulo="Parágrafo" onClick={() => aplicar("formatBlock", "<p>")}>
          <Pilcrow className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <BotaoDaBarra titulo="Título de seção" onClick={() => aplicar("formatBlock", "<h2>")}>
          <Heading2 className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <BotaoDaBarra titulo="Subtítulo" onClick={() => aplicar("formatBlock", "<h3>")}>
          <Heading3 className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <span className="mx-1 h-4 w-px bg-border" />

        <BotaoDaBarra titulo="Lista" onClick={() => aplicar("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <BotaoDaBarra titulo="Lista numerada" onClick={() => aplicar("insertOrderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <span className="mx-1 h-4 w-px bg-border" />

        <BotaoDaBarra titulo="Inserir link" onClick={inserirLink}>
          <LinkIcon className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <BotaoDaBarra titulo="Remover link" onClick={() => aplicar("unlink")}>
          <Unlink className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <BotaoDaBarra titulo="Limpar formatação" onClick={() => aplicar("removeFormat")}>
          <Eraser className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <span className="mx-1 h-4 w-px bg-border" />

        <BotaoDaBarra titulo="Desfazer" onClick={() => aplicar("undo")}>
          <Undo2 className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <BotaoDaBarra titulo="Refazer" onClick={() => aplicar("redo")}>
          <Redo2 className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        <div className="ml-auto">
          {/*
            Ver a marcação continua sendo necessário: o artigo do portal tem
            atributo e classe que a barra não alcança, e às vezes o conserto é
            justamente ali.
          */}
          <Button
            type="button"
            size="sm"
            variant={modo === "fonte" ? "secondary" : "ghost"}
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => setModo(modo === "rico" ? "fonte" : "rico")}
          >
            <Code className="h-3.5 w-3.5" />
            {modo === "rico" ? "Ver HTML" : "Ver formatado"}
          </Button>
        </div>
      </div>

      {modo === "rico" ? (
        <div
          ref={corpoRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Corpo do artigo"
          onInput={capturar}
          onBlur={capturar}
          className="article-html max-h-[32rem] min-h-[20rem] overflow-y-auto p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <Textarea
          value={value}
          onChange={(evento) => onChange(evento.target.value)}
          rows={20}
          aria-label="Corpo do artigo, em HTML"
          className="rounded-none border-0 font-mono text-xs focus-visible:ring-0"
        />
      )}
    </div>
  );
}
