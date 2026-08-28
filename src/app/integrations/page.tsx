import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { AI_PROVIDERS, resolveActiveProvider } from "@/services/ai/providers/catalog";

export const metadata: Metadata = {
  title: "Integrações",
};

/**
 * A tela relata estado, não configuração de build. Pré-renderizada, ela
 * congelaria a leitura do ambiente no momento do deploy e continuaria dizendo
 * "sem chave" depois de alguém ter adicionado uma.
 */
export const dynamic = "force-dynamic";

type IntegrationState = "active" | "connected" | "planned";

type Integration = {
  name: string;
  purpose: string;
  detail: string;
  state: IntegrationState;
};

/**
 * O estado dos provedores sai do **mesmo catálogo** que o servidor usa para
 * escolher com quem falar. Duas listas do mesmo vocabulário divergem, e a
 * divergência apareceria como a tela dizendo "conectado" sobre um provedor que
 * a análise não usa.
 *
 * Só a presença da chave é lida, nunca o valor. Uma tela de integrações que
 * afirma estar conectada sem verificar é exatamente o tipo de coisa que este
 * produto não faz.
 */
function buildIntegrations(): { integrations: Integration[]; caveat: string | null } {
  const active = resolveActiveProvider(process.env);

  const providers: Integration[] = AI_PROVIDERS.map((provider) => {
    const configured = active.configured.includes(provider.id);
    const isActive = active.id === provider.id;

    if (isActive) {
      return {
        name: provider.name,
        purpose: provider.purpose,
        detail:
          "É quem lê o atendimento e propõe oportunidades para a revisão humana. A chave está configurada neste ambiente.",
        state: "active",
      };
    }

    if (configured) {
      return {
        name: provider.name,
        purpose: provider.purpose,
        detail:
          "Chave configurada, mas não é o provedor em uso. Declare `AI_PROVIDER` para trocar.",
        state: "connected",
      };
    }

    return {
      name: provider.name,
      purpose: provider.purpose,
      detail:
        provider.id === "claude"
          ? "Entra como segundo provedor de análise, ao lado do Gemini. Falta a credencial."
          : "Sem chave configurada neste ambiente.",
      state: "planned",
    };
  });

  const integrations: Integration[] = [
    ...providers,
    {
      name: "HubSpot · Atendimentos",
      purpose: "Origem dos atendimentos",
      detail:
        "A conversa do atendimento é lida por REST, só leitura. O objeto de ticket em si está fora do que a credencial alcança, então o cadastro vem por arquivo exportado.",
      state: "connected",
    },
    {
      name: "HubSpot · Base de Conhecimento",
      purpose: "Espelho do portal publicado",
      detail:
        "O suporte.altoqi.com.br é a base publicada, e a Biblioteca espelha os 1.822 artigos dele. Não há API: a leitura é do portal público, e cada artigo guarda a identidade de lá para que reimportar atualize em vez de duplicar.",
      state: "connected",
    },
  ];

  /*
    A ressalva existe pelo mesmo motivo da ressalva de data no painel: quando o
    resultado veio de um critério que ninguém escolheu, quem lê precisa saber.
  */
  const caveat =
    active.reason === "preferencia"
      ? "Há mais de um provedor com chave e nenhum declarado. Vale a ordem escrita no catálogo, declare `AI_PROVIDER` para decidir."
      : active.reason === "declarado-sem-chave"
        ? `O ambiente declara \`AI_PROVIDER=${active.declared}\`, que não tem chave aqui. A análise por IA não funciona até isso bater, e o produto não troca de provedor por conta própria.`
        : null;

  return { integrations, caveat };
}

const stateLabel: Record<IntegrationState, string> = {
  active: "Em uso",
  connected: "Configurada",
  planned: "Planejada",
};

export default function IntegrationsPage() {
  const { integrations, caveat } = buildIntegrations();
  const ativas = integrations.filter((item) => item.state !== "planned").length;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header className="brand-page-header rounded-xl">
          <div className="relative">
            <h1 className="text-2xl font-semibold tracking-tight">
              Integrações
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {ativas === 0
                ? "Nenhuma integração ativa. Todo dado nesta instalação foi cadastrado por alguém."
                : `${ativas} de ${integrations.length} conectadas. O restante ainda não existe, e nada nesta tela finge o contrário.`}
            </p>
          </div>
        </header>

        {caveat && (
          <p className="rounded-xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
            {caveat}
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {integrations.map((item) => (
            <li
              key={item.name}
              className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold tracking-tight">{item.name}</h2>

                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {item.purpose}
                  </p>
                </div>

                <span
                  className={
                    item.state === "active"
                      ? "rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary"
                      : item.state === "connected"
                        ? "rounded-full border border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary"
                        : "rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                  }
                >
                  {stateLabel[item.state]}
                </span>
              </div>

              <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                {item.detail}
              </p>
            </li>
          ))}
        </ul>

        <p className="max-w-3xl text-sm text-muted-foreground">
          Ligar qualquer uma delas envolve rede e credencial, e não acontece sem
          autorização explícita de quem conduz o projeto.
        </p>
      </div>
    </AppShell>
  );
}
