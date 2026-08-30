import { NextResponse } from "next/server";

import { defaultGuards, normalizeGuards } from "@/features/auth/guardedActions";
import { requireAdmin } from "@/features/auth/requireAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSharedWorkspace } from "@/lib/supabase/mode";

/**
 * Quem pode fazer o quê, lido e gravado pelo servidor.
 *
 * Mesmo caminho do interruptor da busca automática, e pelos mesmos dois motivos
 * medidos: `app_settings` não cabe no mapa de tabelas tipadas — seria a décima
 * sexta, e ali o genérico da Supabase estoura o limite de inferência e derruba
 * as outras quinze para `never`; e no navegador `auth.getSession()` ficava
 * pendurado, sem erro e sem rede.
 */

const CHAVE = "permissoes";

/**
 * Ler é de todos, e de propósito.
 *
 * Quem encontra um botão escondido precisa poder descobrir por que, e onde se
 * muda. Esconder a regra de quem não pode mudá-la transforma configuração em
 * folclore: "acho que só o fulano consegue".
 */
export async function GET() {
  if (!isSharedWorkspace()) return NextResponse.json({ guards: defaultGuards() });

  const supabase = await createSupabaseServerClient();

  if (!supabase) return NextResponse.json({ guards: defaultGuards() });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ message: "Entre para ver isto." }, { status: 401 });

  const { data, error } = await supabase
    .from("app_settings" as never)
    .select("value")
    .eq("key", CHAVE)
    .maybeSingle();

  if (error) {
    console.error("PERMISSOES_READ_ERROR", error);

    return NextResponse.json({ message: "Não foi possível ler as permissões." }, { status: 503 });
  }

  return NextResponse.json({
    guards: normalizeGuards((data as { value?: unknown } | null)?.value),
  });
}

/**
 * Escrever é de quem administra, conferido aqui **e** na política do banco.
 *
 * A política é a que vale; esta conferência existe para a recusa chegar à tela
 * com uma frase que alguém entenda, em vez do texto cru do Postgres.
 *
 * O corpo passa pelo normalizador antes de ser gravado, e não depois: assim a
 * ação fixa não pode ser afrouxada nem por quem chama a rota direto, e valor
 * desconhecido não fica guardado esperando derrubar a leitura de amanhã.
 */
export async function PUT(request: Request) {
  const autorizado = await requireAdminParaEscrita();

  if (!autorizado.ok) {
    return NextResponse.json({ message: autorizado.message }, { status: autorizado.status });
  }

  let corpo: unknown;

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  const guards = normalizeGuards(corpo);

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ message: "Sem espaço compartilhado." }, { status: 503 });
  }

  const { error } = await supabase
    .from("app_settings" as never)
    .upsert({ key: CHAVE, value: guards, updated_at: new Date().toISOString() } as never);

  if (error) {
    console.error("PERMISSOES_WRITE_ERROR", error);

    return NextResponse.json({ message: error.message }, { status: 403 });
  }

  return NextResponse.json({ guards });
}

/**
 * A mesma porta da HubSpot, menos o freio.
 *
 * `requireAdmin` recusa quando as chamadas estão bloqueadas, e isso está certo
 * para buscar. Aqui seria uma armadilha: o freio não tem nada a ver com quem
 * pode mexer em permissão.
 */
async function requireAdminParaEscrita() {
  const resultado = await requireAdmin();

  if (!resultado.ok && resultado.status === 423) return { ok: true } as const;

  return resultado;
}
