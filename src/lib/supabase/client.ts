"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Cliente do navegador.
 *
 * As variáveis podem não existir: enquanto o projeto do Supabase não estiver
 * provisionado, o produto continua funcionando sobre o `localStorage`. Isso
 * não é gambiarra de transição. É o que permite rodar o app sem depender de
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
 * metade. Todo mundo trancado do lado de fora de um produto sem conteúdo.
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

/**
 * A entrada pela conta Google está ligada do lado da Supabase.
 *
 * É declarada pelo mesmo motivo do modo compartilhado, e por um defeito
 * concreto: com o provedor desligado, a Supabase responde `400 Unsupported
 * provider` à navegação: o botão tirava a pessoa do produto e a deixava
 * olhando um JSON em inglês, fora da aplicação, sem botão de voltar.
 *
 * Não dá para deduzir isso do navegador sem perguntar antes ao servidor a cada
 * abertura da tela. Um botão que só existe quando funciona é mais honesto que
 * um botão que existe sempre e às vezes leva a lugar nenhum.
 *
 * Ligar no mesmo dia em que as credenciais do Google Cloud entrarem no
 * ambiente da Supabase: `NEXT_PUBLIC_GOOGLE_SIGN_IN=on`.
 */
export function isGoogleSignInEnabled(): boolean {
  return (process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN ?? "").trim().toLowerCase() === "on";
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
