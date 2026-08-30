"use client";

import { useState } from "react";
import { FileDown, ImageIcon, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Ticket } from "@/models/Ticket";

/**
 * O que o cliente anexou, buscado uma vez e servido do nosso balde.
 *
 * A conversa de e-mail carrega arquivo, e é quase sempre o print da tela com o
 * erro — a evidência que falta quando se lê o chamado. A importação não o traz:
 * a URL que a HubSpot devolve vem assinada e com prazo de cerca de um dia, e
 * guardá-la deixaria imagem morta dentro do registro na semana seguinte.
 *
 * **Pedir é ato de alguém.** Não carrega sozinho ao abrir o atendimento: a
 * maioria não tem anexo, e um pedido automático por abertura seria uma
 * requisição contra o servidor de suporte para descobrir que não havia nada. O
 * primeiro clique copia; do segundo em diante quem responde é o balde, e a
 * HubSpot nem fica sabendo.
 */

interface Anexo {
  fileId: string;
  name: string;
  isImage: boolean;
  url: string;
}

export function TicketAttachments({ ticket }: { ticket: Ticket }) {
  const externalId = String(ticket.raw?.hubspotTicketId ?? "");

  /* Quando o atendimento sabe de qual fio veio, a busca custa uma ida em vez de duas. */
  const threadId = String(ticket.raw?.threadId ?? "");
  const [anexos, setAnexos] = useState<Anexo[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState("");

  /*
    Sem número na HubSpot não há o que pedir: é atendimento que entrou por
    arquivo ou foi cadastrado à mão, e a seção some em vez de oferecer um botão
    que não vai funcionar.
  */
  if (externalId === "") return null;

  async function buscar() {
    setBuscando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/hubspot/anexos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId, threadId }),
      });

      const corpo: unknown = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErro(
          (corpo as { message?: string })?.message ?? "Não foi possível buscar os anexos."
        );

        return;
      }

      setAnexos(((corpo as { anexos?: Anexo[] })?.anexos ?? []).filter(Boolean));
    } catch {
      setErro("Sem conexão com o servidor.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <section className="border-t border-border/70 px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" aria-hidden />
          Anexos
        </h3>

        {anexos === null && (
          <Button size="sm" variant="outline" onClick={() => void buscar()} disabled={buscando}>
            {buscando ? "Buscando…" : "Buscar anexos"}
          </Button>
        )}
      </div>

      {anexos === null && !buscando && erro === "" && (
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          O print que o cliente mandou vive na HubSpot. A primeira busca copia para cá; depois
          disso abre sem falar com eles de novo.
        </p>
      )}

      {erro !== "" && (
        <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {erro}
        </p>
      )}

      {anexos !== null && anexos.length === 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">Este atendimento não tem anexo.</p>
      )}

      {anexos !== null && anexos.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {anexos.map((anexo) => (
            <li key={anexo.fileId}>
              {anexo.isImage ? (
                /*
                  Abre em aba nova em vez de num visualizador nosso: a URL é
                  assinada e de curta duração, e o navegador já sabe ampliar
                  imagem. Construir lightbox aqui seria refazer o que ele faz.
                */
                <a
                  href={anexo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg border border-border/70 transition-opacity hover:opacity-85"
                  title={anexo.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={anexo.url}
                    alt={anexo.name}
                    className="h-24 w-32 object-cover"
                    loading="lazy"
                  />
                </a>
              ) : (
                <a
                  href={anexo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-24 w-32 flex-col items-center justify-center gap-1.5 rounded-lg border border-border/70 px-2 text-center transition-colors hover:bg-muted/40"
                  title={anexo.name}
                >
                  <FileDown className="h-5 w-5 text-muted-foreground" aria-hidden />
                  <span className="line-clamp-2 text-[11px] leading-4">{anexo.name}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {anexos !== null && anexos.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ImageIcon className="h-3 w-3" aria-hidden />
          Guardados aqui, em balde privado: são arquivos de cliente, e o endereço vale uma hora.
        </p>
      )}
    </section>
  );
}
