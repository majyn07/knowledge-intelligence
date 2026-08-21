"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALLOWED_EMAIL_DOMAIN, isGoogleSignInEnabled } from "@/lib/supabase/client";

import { useSession } from "../providers/SessionProvider";

/**
 * A marca do Google, desenhada aqui.
 *
 * Quatro caminhos de cor fixa, e não variável de tema: é marca de terceiro, e
 * ela não muda com o nosso claro e escuro. Vem inline porque uma imagem de
 * 700 bytes não vale uma requisição.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="mr-2 h-4 w-4">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.3 30 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z"
      />
    </svg>
  );
}

/**
 * Entrada pela conta da empresa, com o link por e-mail como alternativa.
 *
 * A restrição de domínio é dita antes de a pessoa digitar, não depois de
 * errar: quem não tem e-mail da AltoQi entende na primeira leitura por que
 * não vai conseguir entrar.
 */
export function SignInScreen() {
  const { requestLink, signInWithGoogle } = useSession();
  const googleEnabled = isGoogleSignInEnabled();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setSending(true);
    setError(null);

    const failure = await signInWithGoogle();

    /*
      Sem falha a página já está saindo para o Google, e devolver o botão ao
      estado normal faria a tela piscar "pronto" no meio da navegação.
    */
    if (failure) {
      setSending(false);
      setError(failure);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSending(true);
    setError(null);

    const failure = await requestLink(email);

    setSending(false);

    if (failure) {
      setError(failure);
      return;
    }

    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Image
          src="/brand/altoqi-horizontal-light.png"
          alt="AltoQi"
          width={320}
          height={102}
          priority
          className="h-9 w-auto object-contain"
        />

        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          Knowledge Intelligence
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          O acesso é restrito a contas <strong>@{ALLOWED_EMAIL_DOMAIN}</strong>.{" "}
          {googleEnabled
            ? "Não há senha em nenhum dos caminhos."
            : "Enquanto a conta da empresa não está conectada, a entrada é pelo link enviado por e-mail. Não há senha."}
        </p>

        {sent ? (
          <div className="mt-8 rounded-xl border bg-card p-5">
            <MailCheck className="h-5 w-5 text-primary" aria-hidden />

            <p className="mt-3 text-sm">
              Link enviado para <strong className="break-all">{email}</strong>.
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              Ele vale por pouco tempo e só funciona neste navegador. Se não
              chegar em alguns minutos, confira o lixo eletrônico.
            </p>

            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSent(false);
                setError(null);
              }}
            >
              Usar outro e-mail
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {/*
              O Google vem primeiro porque é o caminho que não depende de
              entrega de e-mail — e entrega falha. O link continua abaixo, para
              quem estiver num navegador sem a conta da empresa.

              Só aparece quando está ligado do outro lado. Com o provedor
              desligado, a navegação termina num `400` da Supabase — a pessoa
              sai do produto e fica olhando um JSON em inglês. Botão que às
              vezes leva a lugar nenhum é pior que botão que ainda não existe.
            */}
            {googleEnabled && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={sending}
                  onClick={() => void handleGoogle()}
                >
                  <GoogleMark />
                  Entrar com a conta AltoQi
                </Button>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">ou receba um link</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail corporativo</Label>

              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder={`nome.sobrenome@${ALLOWED_EMAIL_DOMAIN}`}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "email-erro" : undefined}
              />
            </div>

            {error && (
              <p id="email-erro" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={sending || !email.trim()}>
              {sending ? "Enviando…" : "Receber link de acesso"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
