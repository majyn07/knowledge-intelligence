"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Session } from "@supabase/supabase-js";

import {
  ALLOWED_EMAIL_DOMAIN,
  getSupabase,
  isAllowedEmail,
  isBackendConfigured,
} from "@/lib/supabase/client";

import { signInErrorMessage } from "../signInError";

/**
 * Estado de acesso do produto.
 *
 * São três, não dois, e a diferença importa:
 *
 * `local`    — não há backend configurado. O produto funciona sobre o
 *              `localStorage`, como sempre funcionou. Não é erro nem
 *              degradação: é o modo em que ele roda sem depender de rede.
 * `anonimo`  — há backend, e ninguém entrou. Nada pode ser lido, porque as
 *              políticas do banco fecham tudo para quem não tem perfil.
 * `conectado`— há backend e sessão.
 */
export type AccessState = "carregando" | "local" | "anonimo" | "conectado";

interface SessionContextValue {
  state: AccessState;
  email: string;
  /** Envia o link de acesso. Devolve o erro em texto, ou `null` se deu certo. */
  requestLink: (email: string) => Promise<string | null>;
  /** Entrada pela conta Google da AltoQi. Mesmo retorno do link. */
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();

    if (!supabase) {
      setReady(true);
      return;
    }

    let alive = true;

    /*
      O `catch` não é zelo excessivo: se a sessão guardada expirou, a rede
      caiu ou o token de renovação foi revogado, esta promessa **rejeita** — e
      sem tratamento `ready` ficava falso para sempre, o portão renderizava
      nada, e o resultado era uma tela branca sem uma linha de erro.

      Falhar aqui significa "não há sessão", que é um estado do produto e não
      um impedimento.
    */
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) setSession(data.session);
      })
      .catch(() => {
        if (alive) setSession(null);
      })
      .finally(() => {
        if (alive) setReady(true);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  /**
   * Acesso por link enviado ao e-mail. Não há senha em lugar nenhum do
   * produto — nada para vazar, nada para alguém digitar numa tela errada.
   *
   * O domínio é conferido aqui só para dar erro imediato e legível. Quem
   * decide de verdade é o banco: há `check constraint` na tabela de perfis e
   * um gatilho que recusa antes de criar.
   */
  const requestLink = useCallback(async (address: string) => {
    const supabase = getSupabase();
    if (!supabase) return "Não há servidor configurado nesta instalação.";

    const email = address.trim().toLowerCase();

    if (!isAllowedEmail(email)) {
      return "O acesso é restrito a e-mails @altoqi.com.br.";
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    return error ? signInErrorMessage(error.message) : null;
  }, []);

  /**
   * Entrada pela conta Google da AltoQi.
   *
   * Existe porque o link por e-mail depende de entrega, e entrega falha: o
   * serviço embutido da Supabase entrega dois por hora e recusa endereços de
   * fora da equipe do projeto. Aqui não há caixa de entrada no caminho.
   *
   * `hd` pede ao Google para oferecer só contas do domínio. É conveniência, e
   * **não** segurança — o parâmetro sai do navegador e pode ser alterado por
   * quem quiser. Quem garante a restrição continua sendo o gatilho no banco,
   * que recusa quem não é da AltoQi.
   */
  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return "Não há servidor configurado nesta instalação.";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: ALLOWED_EMAIL_DOMAIN, prompt: "select_account" },
      },
    });

    return error ? signInErrorMessage(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
  }, []);

  const state: AccessState = !ready
    ? "carregando"
    : !isBackendConfigured()
      ? "local"
      : session
        ? "conectado"
        : "anonimo";

  const value = useMemo(
    () => ({
      state,
      email: session?.user.email ?? "",
      requestLink,
      signInWithGoogle,
      signOut,
    }),
    [requestLink, session, signInWithGoogle, signOut, state]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession deve ser utilizado dentro de SessionProvider.");
  }

  return context;
}
