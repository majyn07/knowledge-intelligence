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

/**
 * O banco existir não basta para o produto passar a usá-lo.
 *
 * A integração da Vercel injeta as variáveis do Supabase em todos os
 * ambientes assim que é provisionada. Se só a presença delas decidisse, o
 * primeiro deploy passaria a exigir login com a camada de dados ainda pela
 * metade — todo mundo trancado do lado de fora de um produto sem conteúdo.
 *
 * Por isso a virada é uma decisão declarada, não um efeito colateral de
 * provisionar. Definir `NEXT_PUBLIC_SHARED_WORKSPACE=on` liga o modo
 * compartilhado; sem ela, o produto roda sobre o `localStorage` como sempre.
 */
const sharedEnabled =
  (process.env.NEXT_PUBLIC_SHARED_WORKSPACE ?? "").trim().toLowerCase() === "on";

export function isBackendConfigured(): boolean {
  return sharedEnabled && url !== "" && anonKey !== "";
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
