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
  ImagePlus,
  Redo2,
  Undo2,
  Unlink,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { limparColagem, textoComoHtml } from "../content/pasteHtml";

/**
 * Editor do artigo em HTML.
 *
 * Edita **no próprio HTML renderizado**, e devolve o que está no documento.
 * Isso é o oposto de um editor de esquema (TipTap, ProseMirror) que
 * reserializa tudo para o formato que entende: o artigo do portal tem estilo em
 * atributo, classe da HubSpot e `srcset` nas imagens, e nada disso sobreviveria
 * à ida e volta. Aqui o que ninguém tocar continua idêntico.
 *
 * O preço é usar `document.execCommand`, que está obsoleto na especificação e
 * funciona em todo navegador que importa. A troca está declarada: fidelidade do
 * conteúdo vale mais que pureza de API, porque o conteúdo é da AltoQi e a API é
 * detalhe nosso.
 *
 * A colagem é tratada, e é o buraco que a fidelidade tinha: sem tratamento, o
 * `contenteditable` aceita a marcação do Word inteira, sem sintoma na tela.
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
  const [enviando, setEnviando] = useState(false);
  const corpoRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  /*
    O conteúdo entra uma vez, não a cada render. Reescrever `innerHTML` enquanto
    alguém digita joga o cursor para o começo a cada tecla. É o mesmo motivo de
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

  /**
   * A colagem traz só o que a barra sabe produzir.
   *
   * Um `contenteditable` sem tratamento aceita o que estiver na área de
   * transferência, e o que costuma estar ali é Word, Google Docs ou outra aba.
   * A marcação de origem entra inteira, não muda nada na tela de quem colou, e
   * fica dentro de um artigo que vai para o cliente. É a pior forma de
   * degradar, porque não tem sintoma.
   *
   * A inserção é pelo intervalo, e **não** por `execCommand("insertHTML")`.
   * Medido: o Chrome embrulha o que o `insertHTML` recebe num `<span>` com o
   * estilo calculado do ponto de inserção, `color: lab(96.52 ...)` e
   * `font-size: 0.9375rem`. Seria trocar a marcação do Word pela do navegador,
   * que é o mesmo problema com outro nome.
   *
   * O preço é o desfazer: uma inserção feita à mão nem sempre entra na pilha do
   * navegador. Fidelidade do conteúdo vale mais, e o `Ver HTML` continua ali
   * para desfazer no braço.
   */
  function aoColar(evento: React.ClipboardEvent<HTMLDivElement>) {
    /*
      Print colado é o caminho mais comum de pôr imagem num artigo: ninguém
      salva a captura em arquivo para depois escolhê-la. Vem antes do texto
      porque o Windows põe os dois na área de transferência, e o texto é o nome
      do arquivo.
    */
    const imagem = [...evento.clipboardData.files].find((item) => item.type.startsWith("image/"));

    if (imagem) {
      evento.preventDefault();
      void enviarImagem(imagem);
      return;
    }

    evento.preventDefault();

    const html = evento.clipboardData.getData("text/html");
    const texto = evento.clipboardData.getData("text/plain");

    const conteudo = html ? limparColagem(html) : textoComoHtml(texto);

    if (conteudo === "") return;

    inserir(conteudo);
  }

  /**
   * Põe HTML no ponto do cursor, sem passar pelo navegador.
   *
   * Medido: o Chrome embrulha o que o `execCommand("insertHTML")` recebe num
   * `<span>` com o estilo calculado do ponto de inserção. Aqui entra o que
   * mandamos, e nada além.
   */
  function inserir(conteudo: string) {
    const corpo = corpoRef.current;

    if (!corpo || conteudo === "") return;

    const selecao = window.getSelection();

    /*
      Sem cursor dentro do editor, a imagem vai para o fim. É o caso de quem
      escolhe o arquivo pelo botão: o clique tira o foco do texto, e recusar
      seria um botão que às vezes não faz nada.
    */
    const dentro =
      selecao && selecao.rangeCount > 0 && corpo.contains(selecao.getRangeAt(0).commonAncestorContainer);

    const intervalo = dentro ? selecao.getRangeAt(0) : document.createRange();

    if (!dentro) {
      intervalo.selectNodeContents(corpo);
      intervalo.collapse(false);
    }

    intervalo.deleteContents();

    const pedaco = intervalo.createContextualFragment(conteudo);
    const ultimo = pedaco.lastChild;

    intervalo.insertNode(pedaco);

    /* O cursor fica depois do que entrou: colar e continuar digitando. */
    if (ultimo && selecao) {
      intervalo.setStartAfter(ultimo);
      intervalo.collapse(true);
      selecao.removeAllRanges();
      selecao.addRange(intervalo);
    }

    capturar();
  }

  /**
   * Envia a imagem e a põe no artigo.
   *
   * O acervo é feito de prints: 1.771 dos 1.822 artigos do portal têm imagem.
   * Um editor que formata texto e não aceita figura corrige frase e não
   * documenta passo.
   *
   * O `alt` fica vazio de propósito, e não com o nome do arquivo: `print3.png`
   * não descreve nada para quem usa leitor de tela, e texto alternativo errado
   * é pior que ausente. Quem sabe o que a imagem mostra escreve depois, pelo
   * `Ver HTML`.
   */
  async function enviarImagem(arquivo: File) {
    setEnviando(true);

    try {
      const envio = new FormData();
      envio.append("arquivo", arquivo);

      const resposta = await fetch("/api/library/image", { method: "POST", body: envio });
      const corpo = (await resposta.json()) as { url?: string; message?: string };

      if (!resposta.ok || !corpo.url) {
        toast.error(corpo.message ?? "Não foi possível enviar a imagem.");
        return;
      }

      inserir(`<img src="${corpo.url}" alt="" />`);
    } catch {
      toast.error("Não foi possível falar com o servidor.");
    } finally {
      setEnviando(false);
    }
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

        <BotaoDaBarra
          titulo={enviando ? "Enviando imagem..." : "Inserir imagem"}
          onClick={() => arquivoRef.current?.click()}
        >
          <ImagePlus className="h-3.5 w-3.5" />
        </BotaoDaBarra>

        {/*
          Escondido: quem clica é o botão da barra. Um `input[type=file]` visível
          na barra de formatação seria o único controle com cara de formulário
          no meio de ícones.
        */}
        <input
          ref={arquivoRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0];

            if (arquivo) void enviarImagem(arquivo);

            /* Zera para escolher o mesmo arquivo duas vezes seguidas funcionar. */
            evento.target.value = "";
          }}
        />

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
          onPaste={aoColar}
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
