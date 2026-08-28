"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AlertTriangle, CloudDownload, Globe, Square, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";

import { useLibrary } from "../providers/LibraryProvider";
import type { PortalArticle } from "../import/portal/portalArticlePage";
import { buildPortalImportPlan, type PortalImportPlan } from "../import/portal/portalImportPlan";
import { planVisits } from "../import/portal/portalSchedule";
import type { PortalUrl } from "../import/portal/portalSitemap";
import { LibraryDialog } from "./LibraryDialog";

/**
 * Trazer o acervo publicado para dentro, direto do portal.
 *
 * A importação por arquivo já existe e continua valendo. Esta existe porque a
 * HubSpot **não** entrega o artigo por API: o escopo que parecia ser isso não
 * tem endpoint, e o site search exige permissão que a credencial não tem, e
 * ainda assim devolveria o índice sem o corpo. O portal é público e entrega os
 * dois, mais a trilha que diz categoria e seção.
 *
 * A varredura é em lotes, em série, com o progresso na tela e com botão de
 * parar. Mesma forma da classificação por IA, e pelos mesmos motivos: são
 * ~1.800 páginas do servidor da própria AltoQi, quem começou pode mudar de
 * ideia, e lote que falha não derruba o que já veio.
 */

/** Igual ao teto da rota. Acima disso ela recusa. */
const POR_LOTE = 10;

type Etapa = "inicio" | "listando" | "listado" | "varrendo" | "parado" | "pronto";

interface Sitemap {
  articles: PortalUrl[];
  total: number;
  skippedForeignLocale: number;
}

function Numero({ valor, rotulo, alerta }: { valor: number; rotulo: string; alerta?: boolean }) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <p className={`text-2xl font-semibold ${alerta && valor > 0 ? "text-amber-600" : ""}`}>
        {valor}
      </p>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
    </div>
  );
}

export function PortalImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { taxonomy } = useTaxonomy();
  const { items, importArticles } = useLibrary();

  const [etapa, setEtapa] = useState<Etapa>("inicio");
  const [erro, setErro] = useState<string | null>(null);
  const [sitemap, setSitemap] = useState<Sitemap | null>(null);
  const [visitadas, setVisitadas] = useState(0);
  const [falhas, setFalhas] = useState<string[]>([]);
  const [paginas, setPaginas] = useState<(PortalArticle | null)[]>([]);
  const [parando, setParando] = useState(false);
  const [revisitarTudo, setRevisitarTudo] = useState(false);

  /*
    Ref, e não estado: o laço lê isto a cada lote, e estado só chegaria nele na
    próxima renderização: o que faria o botão de parar demorar a obedecer.
  */
  const pararRef = useRef(false);

  /*
    O que precisa ser buscado de verdade. Sem isto, parar no meio não adianta:
    a próxima passada recomeça do primeiro e repete o que já veio.
  */
  const visitas = useMemo(
    () => (sitemap ? planVisits(sitemap.articles, items, revisitarTudo) : null),
    [sitemap, items, revisitarTudo]
  );

  const lastmodByUrl = useMemo(
    () => new Map((sitemap?.articles ?? []).map((entrada) => [entrada.url, entrada.lastmod])),
    [sitemap]
  );

  const plan: PortalImportPlan | null = useMemo(() => {
    if (paginas.length === 0) return null;

    return buildPortalImportPlan(paginas, taxonomy, items, {
      now: new Date(),
      lastmodByUrl,
    });
  }, [paginas, taxonomy, items, lastmodByUrl]);

  const total = (plan?.create.length ?? 0) + (plan?.update.length ?? 0);

  const listar = useCallback(async () => {
    setEtapa("listando");
    setErro(null);

    try {
      const resposta = await fetch("/api/portal/sitemap");
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.message ?? "Não foi possível ler a lista de artigos.");
        setEtapa("inicio");
        return;
      }

      setSitemap(dados);
      setEtapa("listado");
    } catch {
      setErro("Não foi possível falar com o servidor.");
      setEtapa("inicio");
    }
  }, []);

  const varrer = useCallback(async () => {
    if (!visitas) return;

    pararRef.current = false;
    setParando(false);
    setEtapa("varrendo");
    setVisitadas(0);
    setFalhas([]);
    setPaginas([]);

    const urls = visitas.toVisit.map((entrada) => entrada.url);

    for (let inicio = 0; inicio < urls.length; inicio += POR_LOTE) {
      if (pararRef.current) {
        setEtapa("parado");
        return;
      }

      const lote = urls.slice(inicio, inicio + POR_LOTE);

      try {
        const resposta = await fetch("/api/portal/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: lote }),
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
          /*
            Depois de cento e oitenta lotes bem sucedidos, perder tudo por causa
            do cento e oitenta e um seria jogar fora trabalho pronto. A tela
            guarda o que veio e diz onde parou.
          */
          setFalhas((atual) => [...atual, dados.message ?? "um lote falhou"]);
          setEtapa("parado");
          return;
        }

        const vindas: { article: PortalArticle | null; failure: string | null }[] = dados.articles;

        const recusadas = vindas
          .map((v) => v.failure)
          .filter((motivo): motivo is string => motivo !== null);

        setPaginas((atual) => [...atual, ...vindas.map((v) => v.article)]);
        setFalhas((atual) => [...atual, ...recusadas]);
        setVisitadas((atual) => atual + lote.length);
      } catch {
        setFalhas((atual) => [...atual, "falha de rede num lote"]);
        setEtapa("parado");
        return;
      }
    }

    setEtapa("pronto");
  }, [visitas]);

  const aplicar = useCallback(() => {
    if (!plan) return;

    // Uma escrita, um evento, um aviso, mil e oitocentos de cada seria ruído.
    importArticles(plan.create, plan.update);

    toast.success(
      `${plan.create.length} artigo(s) criado(s) e ${plan.update.length} atualizado(s) a partir do portal.`
    );

    onOpenChange(false);
  }, [plan, importArticles, onOpenChange]);

  const previstos = visitas?.toVisit.length ?? 0;
  const minutos = Math.max(1, Math.round((previstos * 0.5) / 60));
  const percentual = previstos === 0 ? 0 : Math.round((visitadas / previstos) * 100);

  return (
    <LibraryDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Importar do portal"
      description="Traz os artigos publicados em suporte.altoqi.com.br, com título, conteúdo e a seção onde cada um mora."
    >
      <div className="space-y-4">
        {erro && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            {erro}
          </p>
        )}

        {etapa === "inicio" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O portal é público, então esta importação não usa credencial nenhuma. Ela lê a
              lista de artigos e visita cada página, em série e com pausa. É o servidor de
              suporte da AltoQi do outro lado.
            </p>

            <Button onClick={listar}>
              <Globe className="mr-1.5 h-4 w-4" />
              Ver o que há no portal
            </Button>
          </div>
        )}

        {etapa === "listando" && (
          <p className="text-sm text-muted-foreground">Lendo a lista de artigos do portal...</p>
        )}

        {sitemap && (etapa === "listado" || etapa === "varrendo" || etapa === "parado" || etapa === "pronto") && (
          <div className="grid grid-cols-3 gap-3">
            <Numero valor={sitemap.articles.length} rotulo="artigos no portal" />
            <Numero valor={sitemap.total - sitemap.articles.length} rotulo="fora da importação" />
            <Numero valor={visitadas} rotulo="páginas visitadas agora" />
          </div>
        )}

        {etapa === "listado" && visitas && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              As {sitemap?.skippedForeignLocale ?? 0} páginas fora da importação estão em outra
              língua: a taxonomia do cadastro é a do portal em português, e elas entrariam sem
              seção sem que ninguém entendesse por quê.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Numero valor={visitas.missing} rotulo="ainda não temos" />
              <Numero valor={visitas.outdated} rotulo="mudaram no portal" />
              <Numero valor={visitas.upToDate} rotulo="em dia, serão pulados" />
              <Numero valor={visitas.undated} rotulo="sem data no sitemap" />
            </div>

            {visitas.undated > 0 && (
              <p className="text-xs text-muted-foreground">
                O sitemap não datou {visitas.undated} página(s). Sem data não dá para afirmar que
                estão em dia, então elas são visitadas. Pular no escuro deixaria uma alteração de
                fora para sempre.
              </p>
            )}

            {previstos === 0 ? (
              <p className="text-sm">
                Nada a buscar: o acervo já está em dia com o portal.
              </p>
            ) : (
              <p className="text-sm">
                Visitar {previstos} página(s) leva cerca de <strong>{minutos} minuto(s)</strong>,
                em série e com pausa. Dá para parar no meio: o que já veio fica, e a próxima
                passada não busca de novo o que ficou em dia.
              </p>
            )}

            {/*
              Edição feita aqui deixa o registro à frente do portal, e por isso ele
              é pulado. Quem quiser a versão do portal de volta precisa de um jeito
              de pedir, senão a única saída seria apagar o artigo.
            */}
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={revisitarTudo}
                onChange={(event) => setRevisitarTudo(event.target.checked)}
              />
              Revisitar todas, inclusive as que estão em dia
            </label>

            <Button onClick={varrer} disabled={previstos === 0}>
              <CloudDownload className="mr-1.5 h-4 w-4" />
              {previstos === 0 ? "Nada a visitar" : `Visitar ${previstos} página(s)`}
            </Button>
          </div>
        )}

        {etapa === "varrendo" && (
          <div className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${percentual}%` }}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              {visitadas} de {previstos} páginas ({percentual}%).
            </p>

            {/*
              O laço só consulta o pedido de parada na virada do lote, então a
              obediência pode demorar os poucos segundos que faltam para as
              páginas em andamento responderem. Sem dizer isso, o botão parece
              não ter funcionado, e quem acha que não funcionou clica de novo.
            */}
            <Button
              variant="outline"
              disabled={parando}
              onClick={() => {
                pararRef.current = true;
                setParando(true);
              }}
            >
              <Square className="mr-1.5 h-3.5 w-3.5" />
              {parando ? "Parando ao fim do lote..." : "Parar"}
            </Button>
          </div>
        )}

        {etapa === "parado" && (
          <p className="text-sm text-muted-foreground">
            Varredura interrompida em {visitadas} de {previstos}. O que já veio continua abaixo e
            pode ser importado.
          </p>
        )}

        {plan && (etapa === "parado" || etapa === "pronto") && (
          <div className="space-y-3 border-t border-border/60 pt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Numero valor={plan.create.length} rotulo="entram novos" />
              <Numero valor={plan.update.length} rotulo="serão atualizados" />
              <Numero valor={plan.withoutSection} rotulo="sem seção" alerta />
              <Numero valor={plan.skippedNoContent} rotulo="páginas sem conteúdo" alerta />
            </div>

            {plan.keptExistingSection > 0 && (
              <p className="text-xs text-muted-foreground">
                {plan.keptExistingSection} artigo(s) mantêm a seção que já tinham aqui: o portal
                não trouxe nenhuma, e apagar a classificação seria a importação desfazendo
                revisão humana.
              </p>
            )}

            {falhas.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {falhas.length} página(s) não responderam. Elas não entram e podem ser trazidas
                numa próxima passada.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Gênero e responsável não vêm do portal e são preservados no que já existe aqui. O
              conteúdo entra como HTML, que é o formato do portal, e não é convertido.
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {etapa === "varrendo" ? "Fechar" : "Cancelar"}
          </Button>

          <Button onClick={aplicar} disabled={total === 0}>
            <Upload className="mr-1.5 h-4 w-4" />
            {total > 0 ? `Importar ${total} artigo(s)` : "Importar"}
          </Button>
        </div>
      </div>
    </LibraryDialog>
  );
}

/** Botão que abre a importação do portal, para a barra da Biblioteca. */
export function PortalImportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick}>
      <Globe className="mr-1.5 h-4 w-4" />
      Do portal
    </Button>
  );
}
