import { NextResponse } from "next/server";

import { requireAdmin } from "@/features/auth/requireAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSharedWorkspace } from "@/lib/supabase/mode";

/**
 * O interruptor da busca, lido e gravado pelo servidor.
 *
 * A tela poderia falar com o banco direto, e não fala por dois motivos que
 * vieram da prática.
 *
 * `app_settings` não cabe no mapa de tabelas tipadas: ela seria a décima sexta,
 * e o genérico da Supabase estoura o limite de inferência do TypeScript ali,
 * derrubando as outras quinze para `never`. Fora do mapa, `from()` compila com
 * um disfarce e não dispara requisição nenhuma.
 *
 * E no navegador `auth.getSession()` ficava pendurado, sem erro e sem rede, o
 * que deixava a tela esperando para sempre por um estado que não vinha. Aqui a
 * sessão vem do cookie pelo cliente de servidor, que é o mesmo caminho que a
 * porta da HubSpot já usa e que já está sob teste.
 */

const CHAVE = "hubspot_auto_sync";

const VAZIO = { ligado: false, bloqueado: false, ultimaEm: "", execucaoEm: "", execucaoPor: "" };

/**
 * Ler é de todos, e de propósito.
 *
 * Quem vê atendimento entrando sozinho precisa saber por quê e onde se desliga.
 * Esconder o estado de quem não pode mudá-lo faria a pessoa não entender de
 * onde vêm os registros novos.
 */
export async function GET() {
  if (!isSharedWorkspace()) return NextResponse.json({ estado: VAZIO });

  const supabase = await createSupabaseServerClient();

  if (!supabase) return NextResponse.json({ estado: VAZIO });

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
    console.error("AUTO_SYNC_READ_ERROR", error);

    return NextResponse.json({ message: "Não foi possível ler a configuração." }, { status: 503 });
  }

  return NextResponse.json({ estado: (data as { value?: unknown } | null)?.value ?? VAZIO });
}

/**
 * Escrever é de quem administra, conferido aqui **e** na política do banco.
 *
 * A política é a que vale; esta conferência existe para a recusa chegar à tela
 * com uma frase que alguém entenda, em vez do texto cru do Postgres.
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

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ message: "Sem espaço compartilhado." }, { status: 503 });
  }

  const { error } = await supabase
    .from("app_settings" as never)
    .upsert({ key: CHAVE, value: corpo, updated_at: new Date().toISOString() } as never);

  if (error) {
    console.error("AUTO_SYNC_WRITE_ERROR", error);

    return NextResponse.json({ message: error.message }, { status: 403 });
  }

  return NextResponse.json({ estado: corpo });
}

/**
 * A mesma porta da HubSpot, menos o freio.
 *
 * `requireAdmin` recusa quando as chamadas estão bloqueadas, e isso está certo
 * para buscar. Aqui seria uma armadilha: com o freio ligado, ninguém
 * conseguiria desligá-lo.
 */
async function requireAdminParaEscrita() {
  const resultado = await requireAdmin();

  if (!resultado.ok && resultado.status === 423) return { ok: true } as const;

  return resultado;
}
