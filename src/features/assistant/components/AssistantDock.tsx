"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  GripHorizontal,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { MarkdownContent } from "@/components/common/MarkdownContent";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useKnowledgeLifecycle } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { useTickets } from "@/features/analysis/providers/TicketsProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { buildSurvey } from "@/features/survey/survey";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { usePersistedState } from "@/hooks/usePersistedState";
import { STORAGE_KEYS } from "@/lib/storage";

import { DOCK_INICIAL, encaixar, lerPosicao, type DockPosition } from "../dockPosition";
import { pageFacts, type PageFacts } from "../pageFacts";

/**
 * Falar com a IA de onde se está.
 *
 * A pergunta nasce enquanto se olha a tela — "existe conteúdo repetido aqui?",
 * "por qual atendimento eu começo?" — e mandar alguém para outra página para
 * fazê-la é o que faz ninguém fazê-la. Por isso o painel é global, e por isso
 * ele é **móvel**: ele fica por cima do conteúdo, e o conteúdo que ele cobre é
 * justamente aquele sobre o qual se está perguntando.
 *
 * **O contexto vem da rota, não de cada tela.** Se cada página tivesse de
 * declarar o que a IA vê, a página nova esqueceria, e o painel responderia
 * sobre outra coisa sem ninguém saber. Aqui ele lê `usePathname` e os providers
 * que já estão em memória.
 *
 * **E o retrato é calculado só quando alguém pergunta.** O levantamento compara
 * artigos aos pares dentro da seção; rodá-lo a cada render de toda tela custaria
 * caro para responder a uma pergunta que talvez ninguém faça.
 */

interface Fala {
  role: "user" | "assistant";
  content: string;
}

/** O tamanho do painel, também usado para reencaixá-lo quando a janela encolhe. */
const TAMANHO = { width: 400, height: 560 };

export function AssistantDock() {
  const pathname = usePathname();

  const { items: articles, isHydrated: acervoPronto } = useLibrary();
  const { tickets, conversations } = useTickets();
  const { taxonomy } = useTaxonomy();
  const { analyses } = useKnowledgeLifecycle();

  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [aberto, setAberto] = useState(false);
  const [conversa, setConversa] = useState<Fala[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  /* O último retrato enviado, para a pessoa poder conferir o que a IA viu. */
  const [visto, setVisto] = useState<PageFacts | null>(null);
  const [mostrarVisto, setMostrarVisto] = useState(false);

  const fimRef = useRef<HTMLDivElement>(null);

  const [posicao, setPosicao] = usePersistedState<DockPosition>({
    key: STORAGE_KEYS.assistantDock,
    fallback: DOCK_INICIAL,
    parse: lerPosicao,
  });

  /*
    A tela pergunta se há provedor antes de se oferecer. Mesma regra do botão de
    entrar com a conta Google: botão que às vezes leva a lugar nenhum é pior que
    botão que ainda não existe. A resposta entra depois da montagem — no
    primeiro render o servidor não sabe, e supor divergiria na hidratação.
  */
  useEffect(() => {
    let vivo = true;

    fetch("/api/assistant")
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

  /*
    Janela redimensionada põe o painel fora da tela, e ali ele fica sem alça
    para arrastar de volta. O encaixe também roda na montagem, porque a posição
    guardada pode ter vindo de outro monitor.
  */
  useEffect(() => {
    function reencaixar() {
      setPosicao((atual) =>
        encaixar(atual, { width: window.innerWidth, height: window.innerHeight }, TAMANHO)
      );
    }

    reencaixar();
    window.addEventListener("resize", reencaixar);
    return () => window.removeEventListener("resize", reencaixar);
  }, [setPosicao]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [conversa, pensando]);

  /*
    Trocar de tela recomeça a conversa: o retrato mudou, e continuar o fio faria
    a IA responder sobre a Biblioteca com os números dos Atendimentos ainda no
    contexto. Mesma razão de a consulta sobre o artigo recomeçar a cada artigo.
  */
  useEffect(() => {
    setConversa([]);
    setErro(null);
    setVisto(null);
  }, [pathname]);

  /*
    O retrato é montado no envio, e não a cada render.

    O levantamento compara artigos aos pares dentro da seção: calculá-lo o tempo
    todo, em toda tela, para uma pergunta que talvez ninguém faça, é custo sem
    contrapartida.
  */
  const montarRetrato = useCallback((): PageFacts => {
    const analisados = new Set(analyses.map((analysis) => analysis.ticketId));

    const achados = buildSurvey({
      articles,
      tickets,
      taxonomy,
      now: new Date(),
      analisados,
      conversations,
    });

    return pageFacts({ rota: pathname, articles, tickets, conversations, taxonomy, achados });
  }, [analyses, articles, conversations, pathname, taxonomy, tickets]);

  /*
    As sugestões aparecem antes de qualquer pedido, então elas não podem custar
    o levantamento inteiro. Só o recorte da rota, que é barato.
  */
  const sugestoes = useMemo(
    () =>
      pageFacts({ rota: pathname, articles: [], tickets: [], conversations: [], taxonomy, achados: [] })
        .sugestoes,
    [pathname, taxonomy]
  );

  async function perguntar(texto: string) {
    const limpo = texto.trim();
    if (!limpo || pensando) return;

    const proxima: Fala[] = [...conversa, { role: "user", content: limpo }];

    setConversa(proxima);
    setPergunta("");
    setPensando(true);
    setErro(null);

    const retrato = montarRetrato();
    setVisto(retrato);

    try {
      const resposta = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          /* Campo a campo: o retrato tem `sugestoes`, que é desenho e não vai. */
          context: {
            tela: retrato.tela,
            alcance: retrato.alcance,
            fatos: retrato.fatos,
            achados: retrato.achados,
            amostra: retrato.amostra,
          },
          /* A conversa inteira vai junto: o provedor não guarda estado. */
          messages: proxima.slice(-20),
        }),
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

  /*
    Arrastar pelo cabeçalho. Os ouvintes vão na janela e não no elemento: com o
    ponteiro rápido, o cursor sai de cima da barra e o `mousemove` do elemento
    para de chegar, deixando o painel grudado no meio do movimento.
  */
  function arrastar(evento: React.PointerEvent) {
    if (evento.button !== 0) return;

    const inicio = { x: evento.clientX, y: evento.clientY };
    const origem = posicao;

    function mover(atual: PointerEvent) {
      setPosicao(
        encaixar(
          {
            right: origem.right - (atual.clientX - inicio.x),
            bottom: origem.bottom - (atual.clientY - inicio.y),
          },
          { width: window.innerWidth, height: window.innerHeight },
          TAMANHO
        )
      );
    }

    function soltar() {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    }

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  if (disponivel !== true) return null;

  const estilo = { right: `${posicao.right}px`, bottom: `${posicao.bottom}px` } as const;

  if (!aberto) {
    return (
      <Button
        type="button"
        onClick={() => setAberto(true)}
        style={estilo}
        className="fixed z-50 h-12 gap-2 rounded-full pr-5 shadow-lg"
        aria-label="Falar com a IA sobre esta tela"
      >
        <Sparkles className="h-4 w-4" />
        Falar com a IA
      </Button>
    );
  }

  return (
    <div
      style={{ ...estilo, width: `${TAMANHO.width}px` }}
      className="fixed z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl"
      role="dialog"
      aria-label="Assistente"
    >
      {/*
        A barra é a alça. `touch-none` porque sem ela o navegador rola a página
        em vez de entregar o `pointermove`, e o painel não sai do lugar no toque.
      */}
      <div
        onPointerDown={arrastar}
        className="flex cursor-grab touch-none items-center gap-2 border-b border-border/70 bg-muted/40 px-3 py-2 active:cursor-grabbing"
      >
        <GripHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">Assistente</p>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setAberto(false)}
          aria-label="Fechar o assistente"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {conversa.length === 0 && !pensando && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ela responde a partir do que <strong>esta tela mediu</strong> — contagens e achados
              apurados dos dados. Não lê o acervo inteiro, e diz quando a pergunta pede algo que
              ela não tem.
            </p>

            <div className="flex flex-col gap-1.5">
              {sugestoes.map((sugestao) => (
                <Button
                  key={sugestao}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal py-1.5 text-left text-xs"
                  onClick={() => perguntar(sugestao)}
                >
                  {sugestao}
                </Button>
              ))}
            </div>
          </div>
        )}

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
            Lendo o que esta tela mediu...
          </p>
        )}

        {erro && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            {erro}
          </p>
        )}

        {/*
          O que ela viu fica conferível.

          O produto inteiro se apoia em não apresentar palpite como medição, e
          aqui a resposta vem de um modelo sobre números que o produto calculou.
          Quem lê "1.822 artigos, 600 sem seção" precisa poder ver que esses
          números vieram medidos, e não do modelo.
        */}
        {visto && (
          <div className="border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={() => setMostrarVisto((atual) => !atual)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${mostrarVisto ? "" : "-rotate-90"}`}
              />
              O que a IA está vendo desta tela
            </button>

            {mostrarVisto && (
              <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                {visto.fatos.map((fato) => (
                  <div key={fato.rotulo} className="flex justify-between gap-3">
                    <dt className="truncate">{fato.rotulo}</dt>
                    <dd className="shrink-0 font-medium text-foreground">{fato.valor}</dd>
                  </div>
                ))}

                {visto.achados.length > 0 && (
                  <p className="pt-1">
                    E {visto.achados.length} achado(s) do Levantamento, todos calculados dos dados.
                  </p>
                )}
              </dl>
            )}
          </div>
        )}

        <div ref={fimRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border/70 p-3">
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
          placeholder={acervoPronto ? "Pergunte sobre esta tela" : "Carregando os dados..."}
          aria-label="Pergunte sobre esta tela"
          className="min-h-0 resize-none text-sm"
        />

        <Button
          type="button"
          size="icon"
          disabled={!pergunta.trim() || pensando || !acervoPronto}
          onClick={() => perguntar(pergunta)}
          aria-label="Enviar pergunta"
        >
          {pensando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
