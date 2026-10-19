import { NextResponse } from "next/server";

import { requireMember } from "@/features/auth/requireAdmin";
import {
  normalizarVeredito,
  normalizarVereditos,
  VERDICT_KINDS,
  type VerdictKind,
} from "@/features/library/compare/savedVerdict";
import { isSharedWorkspace } from "@/lib/supabase/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Os vereditos da IA guardados para a equipe.
 *
 * Pela rota, e não direto do navegador, pelo motivo do interruptor:
 * `ai_verdicts` não cabe no mapa de tabelas tipadas, que está cheio, e fora
 * dele `from()` no navegador compila sem disparar requisição nenhuma.
 *
 * Sem espaço compartilhado esta rota não é chamada: o navegador guarda os
 * vereditos no próprio armazenamento, como guarda todo o resto.
 */

interface Linha {
  kind: string;
  subject: string;
  fingerprint: string;
  payload: unknown;
  actor_id: string | null;
  actor_label: string;
  at: string;
}

/** Cabe com folga: são 137 pares no acervo real, e um veredito por par. */
const TETO_DE_LINHAS = 5_000;

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind") ?? "";

  if (!(VERDICT_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ message: "Tipo de veredito desconhecido." }, { status: 400 });
  }

  const autorizado = await requireMember();

  if (!autorizado.ok) {
    return NextResponse.json({ message: autorizado.message }, { status: autorizado.status });
  }

  if (!isSharedWorkspace()) return NextResponse.json({ vereditos: [] });

  const supabase = await createSupabaseServerClient();

  if (!supabase) return NextResponse.json({ vereditos: [] });

  const { data, error } = await supabase
    .from("ai_verdicts" as never)
    .select("kind, subject, fingerprint, payload, actor_id, actor_label, at")
    .eq("kind", kind as VerdictKind)
    /* Ordem declarada: paginar sem ordem no Postgres é indefinido. */
    .order("subject")
    .range(0, TETO_DE_LINHAS - 1);

  if (error) {
    console.error("AI_VERDICTS_READ_ERROR", error);

    return NextResponse.json({ message: "Não foi possível ler os vereditos." }, { status: 503 });
  }

  const vereditos = normalizarVereditos(
    ((data ?? []) as Linha[]).map((linha) => ({
      kind: linha.kind,
      subject: linha.subject,
      fingerprint: linha.fingerprint,
      advice: linha.payload,
      actorId: linha.actor_id ?? "",
      actorLabel: linha.actor_label,
      at: linha.at,
    }))
  );

  return NextResponse.json({ vereditos });
}

export async function PUT(request: Request) {
  const autorizado = await requireMember();

  if (!autorizado.ok) {
    return NextResponse.json({ message: autorizado.message }, { status: autorizado.status });
  }

  let corpo: unknown;

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  /*
    O veredito passa pelo mesmo contrato da resposta do modelo antes de ir ao
    banco: o que se guarda para a equipe é o que a tela sabe exibir.
  */
  const veredito = normalizarVeredito(corpo);

  if (!veredito) {
    return NextResponse.json({ message: "Veredito fora do formato esperado." }, { status: 400 });
  }

  const supabase = isSharedWorkspace() ? await createSupabaseServerClient() : null;

  if (!supabase) {
    return NextResponse.json({ message: "Sem espaço compartilhado." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("ai_verdicts" as never).upsert(
    {
      kind: veredito.kind,
      subject: veredito.subject,
      fingerprint: veredito.fingerprint,
      payload: veredito.advice,
      /* Quem pediu vem da sessão, não do corpo: o corpo é afirmação do navegador. */
      actor_id: user?.id ?? null,
      actor_label: veredito.actorLabel,
      at: new Date().toISOString(),
    } as never,
    { onConflict: "kind,subject" }
  );

  if (error) {
    console.error("AI_VERDICTS_WRITE_ERROR", error);

    return NextResponse.json({ message: "Não foi possível guardar o veredito." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
