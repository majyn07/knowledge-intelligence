import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./types";

/**
 * Cliente do servidor, para a rota que troca o código do link por sessão.
 *
 * Usa apenas a chave pública. A chave de serviço existe no ambiente e
 * **não é usada em lugar nenhum**: ela ignora as políticas de acesso, e o
 * produto não tem nenhuma operação que precise disso.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (url === "" || anonKey === "") return null;

  const store = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        for (const { name, value, options } of list) {
          store.set(name, value, options);
        }
      },
    },
  });
}
