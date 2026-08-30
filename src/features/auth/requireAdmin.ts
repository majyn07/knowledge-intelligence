import "server-only";

import { isSharedWorkspace } from "@/lib/supabase/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * A busca na HubSpot é de quem administra, e a conferência é no servidor.
 *
 * Não há papéis neste produto, e continua não havendo: quem pode publicar,
 * excluir e classificar é qualquer pessoa da equipe, porque a equipe é treinada
 * e o histórico responde por quem fez o quê. Esta é a exceção, e ela não é sobre
 * conteúdo: é sobre **gastar requisições contra o servidor de suporte da
 * AltoQi**, que é máquina que atende cliente. Varrer três meses são cinquenta e
 * cinco mil idas, e isso não pode depender de alguém clicar por engano.
 *
 * Esconder o botão não é controle. Quem sabe o endereço chama a rota direto, e
 * até aqui ela não pedia nada: **qualquer requisição disparava leitura na
 * HubSpot**. A porta é esta função.
 */

export type Autorizacao = { ok: true } | { ok: false; status: number; message: string };

/**
 * Sem fundação compartilhada não há conta, e sem conta não há administrador.
 *
 * Recusar aqui trancaria `npm run dev:local` numa porta sem chave: no modo
 * navegador ninguém entra, porque não existe entrar. O controle existe onde
 * existe equipe.
 */
export async function requireAdmin(): Promise<Autorizacao> {
  if (!isSharedWorkspace()) return { ok: true };

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { ok: false, status: 503, message: "O espaço compartilhado não está configurado." };
  }

  /*
    `getUser` e não `getSession`: a sessão vem do cookie e o cookie é do
    navegador. `getUser` confere o token com a Supabase antes de acreditar
    nele, que é a diferença entre ler uma afirmação e conferir um fato.
  */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, message: "Entre para buscar na HubSpot." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  /*
    Falha ao consultar não vira permissão. Um banco fora do ar deixaria a porta
    aberta se o erro caísse no mesmo caminho do "não é administrador", e o erro
    é justamente quando ninguém está olhando.
  */
  if (error) {
    return { ok: false, status: 503, message: "Não foi possível conferir a permissão." };
  }

  if (!data?.is_admin) {
    return {
      ok: false,
      status: 403,
      message:
        "Só quem administra busca na HubSpot. A varredura gera milhares de requisições contra o servidor do suporte.",
    };
  }

  /*
    O freio de mão, e ele é conferido **aqui** e não só na tela.

    Um freio que esconde botão não freia nada: quem já tem uma varredura
    rodando no navegador continua disparando requisições, e quem sabe o
    endereço chama a rota direto. Conferir por requisição é o que faz o
    interruptor parar uma varredura em curso, que é justamente o caso em que
    alguém quer parar.

    Custa uma leitura por chamada, na chave primária de uma tabela de uma
    linha. É o mesmo custo que a conferência de administrador logo acima já
    paga, e o alternativo é um freio que só funciona antes de o problema
    começar.
  */
  const { data: config } = await supabase
    .from("app_settings" as never)
    .select("value")
    .eq("key", "hubspot_auto_sync")
    .maybeSingle();

  const valor = (config as { value?: { bloqueado?: unknown } } | null)?.value;

  if (valor?.bloqueado === true) {
    return {
      ok: false,
      /*
        423, e não 403. O 403 diz "você não pode"; aqui qualquer administrador
        poderia, e o que impede é um estado que alguém ligou e alguém desliga.
        A diferença importa para quem lê o registro do servidor depois.
      */
      status: 423,
      message:
        "As chamadas à HubSpot estão bloqueadas. Quem administra desbloqueia na tela de Atendimentos.",
    };
  }

  return { ok: true };
}

/**
 * Entrou? É só isso que esta pergunta responde.
 *
 * Separada do freio de propósito. O freio existe para impedir que alguém
 * sobrecarregue o servidor de suporte, e servir um anexo **já copiado** para o
 * nosso balde não fala com a HubSpot: recusar ali faria ligar o freio esconder
 * da equipe evidência que ela já tem em casa, que não é o que ele foi feito
 * para fazer.
 */
export async function requireMember(): Promise<Autorizacao> {
  if (!isSharedWorkspace()) return { ok: true };

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { ok: false, status: 503, message: "O espaço compartilhado não está configurado." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, message: "Entre para ver isto." };
  }

  return { ok: true };
}

/**
 * O freio, sozinho, para quem já conferiu a sessão.
 *
 * Conferido **imediatamente antes de falar com a HubSpot**, e não na entrada da
 * rota: é o que faz o interruptor parar o que gasta requisição sem parar o que
 * já está guardado aqui.
 *
 * Não exige administrador. A varredura é de quem administra porque gera
 * milhares de requisições; abrir o anexo de um chamado gera uma, e quem está
 * lendo aquele chamado é quem precisa ver o print que o cliente mandou.
 */
export async function requireHubSpotRead(): Promise<Autorizacao> {
  if (!isSharedWorkspace()) return { ok: true };

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { ok: false, status: 503, message: "O espaço compartilhado não está configurado." };
  }

  const { data: config } = await supabase
    .from("app_settings" as never)
    .select("value")
    .eq("key", "hubspot_auto_sync")
    .maybeSingle();

  const valor = (config as { value?: { bloqueado?: unknown } } | null)?.value;

  if (valor?.bloqueado === true) {
    return {
      ok: false,
      status: 423,
      message:
        "As chamadas à HubSpot estão bloqueadas, então o que ainda não foi copiado não pode ser buscado. Quem administra desbloqueia na tela de Atendimentos.",
    };
  }

  return { ok: true };
}
