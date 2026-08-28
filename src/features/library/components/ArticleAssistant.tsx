"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, Send, Sparkles } from "lucide-react";

import { MarkdownContent } from "@/components/common/MarkdownContent";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { dayOf } from "@/lib/dates";
import { articleStatusLabel, type KnowledgeArticle } from "@/models/KnowledgeArticle";
import { sectionPath } from "@/models/Taxonomy";
import {
  boundArticleText,
  PERGUNTAS_SUGERIDAS,
} from "@/services/ai/library/articleChat";

import { articleText } from "../content/articleText";

/**
 * Consultar a IA sobre o artigo aberto.
 *
 * Com mil e oitocentos artigos importados, avaliar o acervo é o trabalho, e
 * fazê-lo sozinho significa reler cada texto inteiro. A IA lê junto: resume,
 * aponta o que falta, diz o que parece desatualizado.
 *
 * **Ela avalia; quem decide é quem lê.** Nada aqui altera o artigo, e a
 * resposta é texto, não estrutura aplicável. Pela mesma razão que a análise do
 * atendimento propõe oportunidade e a revisão humana aprova.
 */

interface Fala {
  role: "user" | "assistant";
  content: string;
}

export function ArticleAssistant({ article }: { article: KnowledgeArticle }) {
  const { taxonomy } = useTaxonomy();

  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [conversa, setConversa] = useState<Fala[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  /*
    A tela pergunta se há provedor antes de se oferecer. Mesma regra do botão
    de entrar com a conta Google. A resposta entra depois da montagem: no
    primeiro render o servidor não sabe, e supor divergiria na hidratação.
  */
  useEffect(() => {
    let vivo = true;

    fetch("/api/library/chat")
      .then((resposta) => (resposta.ok ? resposta.json() : { configured: false }))
      .then((dados: { configured?: boolean }) => {
        if (vivo) setDisponivel(Boolean(dados.configured));
      })
      .catch(() => {
        if (vivo) setDisponivel(false);
      });

    return () => {
      vivo = false;
    };
  }, []);

  // Conversa é por artigo: abrir outro não herda o que se perguntou do anterior.
  useEffect(() => {
    setConversa([]);
    setErro(null);
  }, [article.id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [conversa, pensando]);

  const contexto = useMemo(() => {
    const { text, truncated } = boundArticleText(articleText(article));

    return {
      title: article.title,
      summary: article.summary,
      text,
      sectionPath: sectionPath(taxonomy, article.sectionId),
      status: articleStatusLabel[article.status],
      updatedAt: dayOf(article.updatedAt),
      truncated,
    };
  }, [article, taxonomy]);

  async function perguntar(texto: string) {
    const limpo = texto.trim();
    if (!limpo || pensando) return;

    const proxima: Fala[] = [...conversa, { role: "user", content: limpo }];

    setConversa(proxima);
    setPergunta("");
    setPensando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/library/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /* A conversa inteira vai junto: o provedor não guarda estado. */
        body: JSON.stringify({ article: contexto, messages: proxima.slice(-20) }),
      });

      const dados: { message?: string } = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.message ?? "A IA não conseguiu responder.");
        return;
      }

      setConversa([...proxima, { role: "assistant", content: dados.message ?? "" }]);
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setPensando(false);
    }
  }

  if (disponivel === null || disponivel === false) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-card">
      <div className="flex items-center gap-2 border-b border-border/70 px-5 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Consultar a IA sobre este artigo</p>
      </div>

      <div className="space-y-4 p-5">
        {conversa.length === 0 && !pensando && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ela responde <strong>a partir deste artigo</strong> e diz quando ele não trata do
              assunto, em vez de completar com conhecimento geral. Avalia e sugere; alterar
              continua sendo ato de quem lê.
              {contexto.truncated && " O artigo é longo e foi enviado em parte, e ela avisa quando isso pesar na resposta."}
            </p>

            {/*
              Empilhadas e de largura cheia. Lado a lado elas mantinham a largura
              natural da frase (o botão traz `shrink-0`) e furavam a coluna em
              até cento e oitenta pixels, empurrando a página.
            */}
            <div className="flex flex-col gap-1.5">
              {PERGUNTAS_SUGERIDAS.map((sugestao) => (
                <Button
                  key={sugestao}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-auto w-full shrink justify-start whitespace-normal py-1.5 text-left text-xs"
                  onClick={() => perguntar(sugestao)}
                >
                  {sugestao}
                </Button>
              ))}
            </div>
          </div>
        )}

        {conversa.length > 0 && (
          <div className="max-h-[26rem] space-y-4 overflow-y-auto pr-1">
            {conversa.map((fala, indice) => (
              <div key={indice} className={fala.role === "user" ? "flex justify-end" : ""}>
                {fala.role === "user" ? (
                  <p className="max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                    {fala.content}
                  </p>
                ) : (
                  <div className="max-w-none text-sm leading-7">
                    <MarkdownContent content={fala.content} />
                  </div>
                )}
              </div>
            ))}

            {pensando && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Lendo o artigo...
              </p>
            )}

            <div ref={fimRef} />
          </div>
        )}

        {erro && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            {erro}
          </p>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            value={pergunta}
            onChange={(evento) => setPergunta(evento.target.value)}
            onKeyDown={(evento) => {
              // Enter envia; Shift+Enter quebra linha, como em toda conversa.
              if (evento.key !== "Enter" || evento.shiftKey) return;
              evento.preventDefault();
              perguntar(pergunta);
            }}
            rows={2}
            placeholder="Pergunte alguma coisa sobre este artigo"
            aria-label="Pergunte alguma coisa sobre este artigo"
            className="min-h-0 resize-none text-sm"
          />

          <Button
            type="button"
            size="icon"
            disabled={!pergunta.trim() || pensando}
            onClick={() => perguntar(pergunta)}
            aria-label="Enviar pergunta"
          >
            {pensando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
