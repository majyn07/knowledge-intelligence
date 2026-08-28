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

  return { ok: true };
}
