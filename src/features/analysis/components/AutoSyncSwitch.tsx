"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
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
  type EstadoDaSincronizacao,
} from "../autoSync";
import { gravarEstado, lerEstado } from "../autoSyncRepository";

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

  async function alternar() {
    if (!estado) return;

    setGravando(true);
    const falha = await gravarEstado({ ...estado, ligado: !estado.ligado });
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
    toast.success(estado.ligado ? "Busca automática desligada." : "Busca automática ligada.");
  }

  return (
    <section className="rounded-xl border border-border/70 bg-muted/20 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="h-4 w-4 text-primary" />
            Busca automática {estado.ligado ? "ligada" : "desligada"}
          </p>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            {estado.ligado
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
              alguém abre, a busca cobre o intervalo perdido.
            </p>
          )}

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
        </div>

        {souAdministrador ? (
          <Button
            variant={estado.ligado ? "outline" : "default"}
            size="sm"
            className="shrink-0"
            disabled={gravando}
            onClick={() => void alternar()}
          >
            {estado.ligado ? "Desligar" : "Ligar"}
          </Button>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">
            Só quem administra muda isto.
          </span>
        )}
      </div>
    </section>
  );
}
