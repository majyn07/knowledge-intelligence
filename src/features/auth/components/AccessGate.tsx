"use client";

import type { ReactNode } from "react";

import { LoadingScreen } from "@/components/common/LoadingScreen";

import { useSession } from "../providers/SessionProvider";
import { SignInScreen } from "./SignInScreen";

/**
 * Decide entre entrar no produto e pedir acesso.
 *
 * Enquanto não há backend configurado o portão fica aberto e o produto roda
 * sobre o `localStorage`, como sempre rodou. Isso mantém o app utilizável em
 * qualquer instalação sem servidor, e faz uma variável de ambiente ausente
 * degradar em vez de trancar todo mundo do lado de fora.
 *
 * Nada é renderizado enquanto a sessão é resolvida: mostrar a tela de acesso
 * por um instante para quem já está conectado é pior que esperar.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const { state } = useSession();

  // Tela de espera, e não `null`: nada renderizado é indistinguível de app quebrado.
  if (state === "carregando") return <LoadingScreen label="Verificando o acesso…" />;
  if (state === "anonimo") return <SignInScreen />;

  return <>{children}</>;
}
