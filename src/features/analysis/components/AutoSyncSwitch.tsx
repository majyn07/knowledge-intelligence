"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { RelativeDate } from "@/components/common/RelativeDate";
import { Button } from "@/components/ui/button";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import { isSharedWorkspace } from "@/lib/supabase/mode";

import {
  decidirSincronizacao,
  intervaloLegivel,
  INTERVALO_PADRAO_MS,
  motivoLegivel,
  varreduraEmCurso,
  type EstadoDaSincronizacao,
} from "../autoSync";
import { gravarEstado, lerEstado } from "../autoSyncRepository";

/**
 * As opções de atraso, em dias.
 *
 * Curtas e discretas de propósito: é escolha de processo, não de precisão. Zero
 * existe para quem quiser o comportamento antigo, e a tela diz o que ele custa.
 */
const ATRASOS = [
  { dias: 0, rotulo: "agora" },
  { dias: 1, rotulo: "1 dia atrás" },
  { dias: 2, rotulo: "2 dias atrás" },
  { dias: 3, rotulo: "3 dias atrás" },
  { dias: 7, rotulo: "1 semana atrás" },
];

function rotuloDoAtraso(dias: number): string {
  return ATRASOS.find((opcao) => opcao.dias === dias)?.rotulo ?? `${dias} dia(s) atrás`;
}

/**
 * O interruptor da busca automática.
 *
 * Ele fica na tela de Atendimentos, e não em Configurações, porque é aqui que
 * a consequência dele aparece: quem vê atendimento entrando sozinho precisa
 * saber por quê, e onde desligar.
 *
 * **Aparece para todos, e só administrador mexe.** Esconder o estado de quem
 * não pode mudá-lo faria a pessoa não entender de onde vêm os atendimentos
 * novos. É o contrário do botão de buscar, que some: lá não há nada a saber,
 * aqui há.
 */
export function AutoSyncSwitch() {
  const { souAdministrador } = usePeople();

  const [estado, setEstado] = useState<EstadoDaSincronizacao | null>(null);
  const [gravando, setGravando] = useState(false);

  const carregar = useCallback(async () => {
    setEstado(await lerEstado());
  }, []);

  useEffect(() => {
    if (!isSharedWorkspace()) return;

    void carregar();
  }, [carregar]);

  /* Sem espaço compartilhado não há equipe, e sem equipe não há o que combinar. */
  if (!isSharedWorkspace() || !estado) return null;

  const decisao = decidirSincronizacao(estado, new Date());

  /**
   * Muda o atraso da janela.
   *
   * É cadastro e não constante pela regra desta casa, e porque o número certo
   * depende de quanto o suporte demora para associar o ticket — coisa que quem
   * trabalha lá sabe melhor que qualquer medição nossa.
   */
  async function mudarAtraso(dias: number) {
    if (!estado) return;

    setGravando(true);
    const falha = await gravarEstado({ ...estado, atrasoDias: dias });
    setGravando(false);

    if (falha) {
      toast.error(`Não foi possível mudar: ${falha.erro}`);
      return;
    }

    await carregar();
    toast.success(
      dias === 0
        ? "A busca automática passa a olhar até agora."
        : `A busca automática passa a olhar até ${dias} dia(s) atrás.`
    );
  }

  async function alternar(campo: "ligado" | "bloqueado") {
    if (!estado) return;

    setGravando(true);
    const falha = await gravarEstado({ ...estado, [campo]: !estado[campo] });
    setGravando(false);

    /*
      A recusa da política precisa chegar à tela. Um interruptor que volta
      sozinho ao estado anterior, calado, é pior que um desabilitado: quem
      clicou fica achando que funcionou.
    */
    if (falha) {
      toast.error(`Não foi possível mudar: ${falha.erro}`);
      return;
    }

    await carregar();

    const dito: Record<"ligado" | "bloqueado", [string, string]> = {
      ligado: ["Busca automática desligada.", "Busca automática ligada."],
      bloqueado: [
        "Chamadas à HubSpot liberadas.",
        "Chamadas à HubSpot bloqueadas. Nenhuma sai, nem automática nem à mão.",
      ],
    };

    toast.success(dito[campo][estado[campo] ? 0 : 1]);
  }

  return (
    <section className="rounded-xl border border-border/70 bg-muted/20 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            {estado.bloqueado ? (
              <>
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Chamadas à HubSpot bloqueadas
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 text-primary" />
                Busca automática {estado.ligado ? "ligada" : "desligada"}
              </>
            )}
          </p>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            {estado.bloqueado
              ? "Nenhuma chamada sai, nem automática nem à mão, e o servidor recusa por requisição. Vale até uma varredura já em curso."
              : estado.ligado
              ? `Quem administra e está com o produto aberto traz o que caiu nas caixas do suporte, ${intervaloLegivel(INTERVALO_PADRAO_MS)}.`
              : "Nada entra sozinho. Os atendimentos só chegam por quem clicar em buscar."}
          </p>

          {/*
            Não é um cron, e a tela diz isso. Um cron rodaria no servidor sem
            sessão de ninguém, e as políticas de acesso exigem sessão para
            escrever: fazê-lo funcionar exigiria devolver ao ambiente uma chave
            que ignora todas elas. O preço da escolha é este, e escondê-lo faria
            alguém contar com uma busca que não aconteceu.
          */}
          {estado.ligado && (
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">
              De madrugada e no fim de semana ninguém tem o produto aberto, e nada entra. Quando
              alguém abre, a busca cobre o intervalo perdido. Ela também só anda com esta aba à
              frente: o navegador estrangula aba de fundo.
            </p>
          )}

          {/*
            O atraso da janela, com o motivo ao lado.

            Sem a frase, ligar a automática e não ver nada entrando parece
            defeito. Medido na caixa real: nas conversas mais recentes de uma
            janela de três dias, 119 de 144 não tinham chamado associado.
          */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Olhar até</span>

            {souAdministrador ? (
              <select
                className="h-7 rounded-lg border border-border/70 bg-background px-2 text-xs"
                value={estado.atrasoDias}
                disabled={gravando}
                onChange={(evento) => void mudarAtraso(Number(evento.target.value))}
              >
                {ATRASOS.map((opcao) => (
                  <option key={opcao.dias} value={opcao.dias}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-medium">{rotuloDoAtraso(estado.atrasoDias)}</span>
            )}

            <span className="max-w-md text-xs leading-5 text-muted-foreground">
              {estado.atrasoDias === 0
                ? "Conversa recente costuma não ter chamado associado ainda, e sem chamado ela não vira atendimento."
                : "A HubSpot associa o chamado depois que alguém do suporte trata a conversa. Olhar o que acabou de chegar é olhar antes de existir o que se quer."}
            </span>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {estado.ultimaEm === "" ? (
              "Ainda não houve uma primeira busca."
            ) : (
              <>
                Última busca <RelativeDate value={estado.ultimaEm} />.
              </>
            )}{" "}
            {!decisao.sincronizar && motivoLegivel[decisao.motivo]}
          </p>

          {varreduraEmCurso(estado, new Date()) && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Varredura em curso{estado.execucaoPor ? `, por ${estado.execucaoPor}` : ""}. Uma por
              vez, senão o servidor do suporte sente as duas somadas.
            </p>
          )}
        </div>

        {souAdministrador ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant={estado.ligado ? "outline" : "default"}
              size="sm"
              disabled={gravando || estado.bloqueado}
              onClick={() => void alternar("ligado")}
            >
              {estado.ligado ? "Desligar automática" : "Ligar automática"}
            </Button>

            {/*
              O freio é outro botão, e destrutivo de propósito. Desligar a
              automática ainda deixa qualquer administrador varrer três meses à
              mão; isto para tudo, inclusive uma varredura em curso, porque a
              conferência é por requisição no servidor.
            */}
            <Button
              variant={estado.bloqueado ? "default" : "destructive"}
              size="sm"
              disabled={gravando}
              onClick={() => void alternar("bloqueado")}
            >
              {estado.bloqueado ? "Liberar chamadas" : "Bloquear tudo"}
            </Button>
          </div>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">
            Só quem administra muda isto.
          </span>
        )}
      </div>
    </section>
  );
}
