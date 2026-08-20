import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Integrações",
};

/**
 * A tela relata estado, não configuração de build. Pré-renderizada, ela
 * congelaria a leitura do ambiente no momento do deploy e continuaria dizendo
 * "sem chave" depois de alguém ter adicionado uma.
 */
export const dynamic = "force-dynamic";

type IntegrationState = "connected" | "planned";

type Integration = {
  name: string;
  purpose: string;
  detail: string;
  state: IntegrationState;
};

/**
 * O estado do provedor de análise é lido do ambiente do servidor — só a
 * presença da chave, nunca o valor. Uma tela de integrações que afirma estar
 * conectada sem verificar é exatamente o tipo de coisa que este produto não faz.
 */
function buildIntegrations(): Integration[] {
  const analysisConfigured = Boolean(process.env.GEMINI_API_KEY);

  return [
    {
      name: "Google Gemini",
      purpose: "Análise de atendimentos",
      detail: analysisConfigured
        ? "Chave configurada neste ambiente. É o provedor que lê o atendimento e propõe oportunidades para a revisão humana."
        : "Sem chave configurada neste ambiente. A análise por IA não funciona até que ela exista.",
      state: analysisConfigured ? "connected" : "planned",
    },
    {
      name: "Claude",
      purpose: "Análise e acesso à HubSpot",
      detail:
        "Entra como segundo provedor de análise e é por onde o acesso à HubSpot será mediado — não haverá conexão REST direta com o CRM.",
      state: "planned",
    },
    {
      name: "HubSpot · Atendimentos",
      purpose: "Origem dos atendimentos",
      detail:
        "Hoje os atendimentos são cadastrados à mão. A importação será desenhada contra o formato que a Claude devolver, não antes dele.",
      state: "planned",
    },
    {
      name: "HubSpot · Base de Conhecimento",
      purpose: "Espelho do portal publicado",
      detail:
        "O suporte.altoqi.com.br é a base publicada. A Biblioteca passará a espelhá-lo, preservando a identidade de cada artigo para que sincronizar atualize em vez de duplicar.",
      state: "planned",
    },
  ];
}

const stateLabel: Record<IntegrationState, string> = {
  connected: "Conectada",
  planned: "Planejada",
};

export default function IntegrationsPage() {
  const integrations = buildIntegrations();
  const connected = integrations.filter((item) => item.state === "connected").length;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header className="brand-page-header rounded-xl">
          <div className="relative">
            <h1 className="text-2xl font-semibold tracking-tight">
              Integrações
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {connected === 0
                ? "Nenhuma integração ativa. Todo dado nesta instalação foi cadastrado por alguém."
                : `${connected} de ${integrations.length} conectadas. O restante ainda não existe — e nada nesta tela finge o contrário.`}
            </p>
          </div>
        </header>

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
                    item.state === "connected"
                      ? "rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary"
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
