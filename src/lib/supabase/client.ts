"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Cliente do navegador.
 *
 * As variáveis podem não existir: enquanto o projeto do Supabase não estiver
 * provisionado, o produto continua funcionando sobre o `localStorage`. Isso
 * não é gambiarra de transição — é o que permite rodar o app sem depender de
 * rede, e o que faz uma falha de configuração degradar em vez de derrubar.
 *
 * Quem consome pergunta `isBackendConfigured()` antes e escolhe a fonte. Não
 * há caminho em que uma variável ausente vire exceção dentro de um efeito.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isBackendConfigured(): boolean {
  return url !== "" && anonKey !== "";
}

let client: SupabaseClient<Database> | null = null;

/**
 * Devolve o cliente, ou `null` quando não há backend configurado.
 *
 * `null` em vez de exceção porque a ausência de backend é um estado previsto
 * do produto, não um erro. A instância é única: cada `createBrowserClient`
 * abre a própria conexão de tempo real.
 */
export function getSupabase(): SupabaseClient<Database> | null {
  if (!isBackendConfigured()) return null;

  if (!client) {
    client = createBrowserClient<Database>(url, anonKey);
  }

  return client;
}

/** Domínio único de acesso. A regra também vive no banco, por constraint. */
export const ALLOWED_EMAIL_DOMAIN = "altoqi.com.br";

export function isAllowedEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}
