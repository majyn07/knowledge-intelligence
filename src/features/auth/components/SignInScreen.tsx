"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/supabase/client";

import { useSession } from "../providers/SessionProvider";

/**
 * Entrada por link enviado ao e-mail. Sem senha, em nenhum momento.
 *
 * A restrição de domínio é dita antes de a pessoa digitar, não depois de
 * errar: quem não tem e-mail da AltoQi entende na primeira leitura por que
 * não vai conseguir entrar.
 */
export function SignInScreen() {
  const { requestLink } = useSession();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          O acesso é restrito a e-mails <strong>@{ALLOWED_EMAIL_DOMAIN}</strong>.
          Não há senha: você recebe um link e entra por ele.
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
