import { NextResponse } from "next/server";

/**
 * Qual versão do produto está no ar agora.
 *
 * Existe para o navegador de quem já está com a página aberta perceber que
 * houve publicação. Sem isso a pessoa continua num código antigo até recarregar
 * por acaso — e quando o formato do dado muda entre uma versão e outra, ela
 * grava com a forma antiga por cima do que o resto da equipe já leu na nova.
 *
 * A identidade vem do deploy, não do commit: dois deploys do mesmo commit são
 * duas publicações, e quem estava com a aba aberta precisa saber das duas. Fora
 * da Vercel o valor é fixo — no desenvolvimento o servidor reinicia a cada
 * salvamento, e um aviso a cada tecla seria ruído, não informação.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const version =
    process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";

  return NextResponse.json(
    { version },
    // Resposta guardada em cache responderia com a versão anterior justamente
    // no momento em que a pergunta importa.
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
