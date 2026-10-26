"use client";

import { useMemo, useState } from "react";
import { ClipboardCopy, ExternalLink, Link2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { markdownParaHtml } from "../content/markdownHtml";
import { portalIdOf } from "../import/portal/portalSitemap";
import {
  editadosAqui,
  estadoNoPortal,
  lerEnderecoDoPortal,
  portalStateLabel,
} from "../portalSync";
import { useLibrary } from "../providers/LibraryProvider";

/**
 * O que falta para o cliente ler este artigo como ele está aqui.
 *
 * A HubSpot não tem API para publicar, então a última perna é colar à mão. Este
 * aviso diz quando ela falta e entrega o texto pronto para colar. Aparece só
 * quando há algo a fazer: "igual ao portal" em todo artigo seria ruído.
 */
export function PortalSyncNotice({ article }: { article: KnowledgeArticle }) {
  const { eventsFor } = useActivity();
  const { items, linkToPortal } = useLibrary();
  const [endereco, setEndereco] = useState("");
  const [recusa, setRecusa] = useState<string | null>(null);

  function ligar() {
    const leitura = lerEnderecoDoPortal(endereco, article.id, items, portalIdOf);

    if (!leitura.ok) {
      setRecusa(leitura.motivo);
      return;
    }

    setRecusa(null);
    setEndereco("");
    linkToPortal(article.id, leitura.portalArticleId, leitura.url);
  }

  const estado = useMemo(
    () => estadoNoPortal(article, editadosAqui(eventsFor("article", article.id))),
    [article, eventsFor]
  );

  if (estado === null || estado === "em-dia") return null;

  const explicacao = {
    aguardando:
      "O texto daqui mudou desde a última importação, e o portal continua com o anterior. Cole a versão nova no editor da HubSpot; a próxima importação do portal confirma.",
    "fora-do-portal":
      "Este artigo está publicado aqui e não tem página no portal: o cliente não o encontra. Crie o artigo na HubSpot com o texto copiado e cole aqui o endereço da página. Sem essa ligação, a próxima importação o traria como outro artigo.",
    "a-conferir":
      "Foi editado aqui antes de o produto guardar a versão do portal, e o histórico não diz se a mudança foi no texto ou só na classificação. Confira com a página do portal.",
  }[estado];

  async function copiar() {
    /*
      O que se cola é o conteúdo **guardado**, e não o que a tela mostra: a
      leitura acrescenta âncora, caixa de aviso e cor removida, que são camada
      de apresentação daqui e não pertencem ao artigo do cliente.
    */
    const html =
      article.contentFormat === "html" ? article.content : markdownParaHtml(article.content);

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([html], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(html);
      }

      toast.success("Conteúdo copiado. Cole no corpo do artigo, no editor da HubSpot.");
    } catch {
      toast.error("O navegador não deixou copiar. Selecione o texto do artigo e copie à mão.");
    }
  }

  return (
    <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <UploadCloud className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">{portalStateLabel[estado]}</p>
          <p className="text-sm text-muted-foreground">{explicacao}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {estado !== "a-conferir" && (
            <Button type="button" size="sm" variant="outline" onClick={copiar}>
              <ClipboardCopy className="mr-2 h-3.5 w-3.5" />
              Copiar para a HubSpot
            </Button>
          )}

          {article.url && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              render={<a href={article.url} target="_blank" rel="noreferrer" />}
              nativeButton={false}
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Ver no portal
            </Button>
          )}
        </div>
      </div>

      {estado === "fora-do-portal" && (
        <form
          className="mt-3 flex flex-wrap items-center gap-2 pl-7"
          onSubmit={(event) => {
            event.preventDefault();
            ligar();
          }}
        >
          <Input
            className="h-8 min-w-0 flex-1 sm:max-w-md"
            placeholder="Endereço da página no portal, depois de criada"
            value={endereco}
            onChange={(event) => setEndereco(event.target.value)}
            aria-label="Endereço da página no portal"
          />
          <Button type="submit" size="sm" disabled={endereco.trim() === ""}>
            <Link2 className="mr-2 h-3.5 w-3.5" />
            Ligar ao portal
          </Button>

          {recusa && <p className="w-full text-xs text-destructive">{recusa}</p>}
        </form>
      )}
    </section>
  );
}
