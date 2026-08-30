import { NextResponse } from "next/server";

import { requireHubSpotRead, requireMember } from "@/features/auth/requireAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSharedWorkspace } from "@/lib/supabase/mode";
import { hubspotConversationService } from "@/services/hubspot/conversationService";
import { HubSpotFailure, type HubSpotFailureKind } from "@/services/hubspot/hubspotClient";

/**
 * Os anexos de um atendimento, copiados uma vez e servidos daqui em diante.
 *
 * A HubSpot devolve a URL do arquivo **assinada e com prazo**: a que foi medida
 * valia cerca de um dia. Guardá-la deixaria imagem morta dentro do registro na
 * semana seguinte, e buscar de novo a cada exibição gastaria duas requisições
 * contra o servidor de suporte toda vez que alguém abrisse um chamado para
 * olhar uma figura — que é exatamente o que o freio existe para impedir.
 *
 * Então: na primeira vez, copia; nas próximas, o balde responde e a HubSpot
 * nem fica sabendo. A cópia é **por atendimento pedido**, e não em lote na
 * varredura: copiar tudo seriam milhares de arquivos, a maioria que ninguém
 * vai abrir.
 */

const BALDE = "anexos-atendimento";

/** Quanto tempo a URL que devolvemos vale. Uma sessão de leitura, não mais. */
const VALIDADE_SEGUNDOS = 60 * 60;

/**
 * O que marca "já procurei aqui e não havia nada".
 *
 * Sem ele, um atendimento sem anexo seria consultado na HubSpot toda vez que
 * alguém o abrisse: a pasta vazia é indistinguível da pasta que nunca foi
 * preenchida, e a maioria dos atendimentos não tem anexo nenhum.
 */
const MARCA_VAZIO = ".sem-anexo";

const STATUS_POR_FALHA: Record<HubSpotFailureKind, number> = {
  "sem-credencial": 503,
  "credencial-recusada": 502,
  "sem-permissao": 502,
  "prazo-esgotado": 504,
  falha: 502,
};

export interface AnexoServido {
  fileId: string;
  name: string;
  isImage: boolean;
  /** Assinada por nós, para quem já entrou. */
  url: string;
}

export async function POST(request: Request) {
  /*
    Sessão na entrada; o freio só antes de falar com a HubSpot.

    Conferir o freio aqui em cima recusaria também o anexo **já copiado**, que é
    servido do nosso balde e não gasta requisição nenhuma. Ligar o freio
    esconderia da equipe evidência que ela já tem em casa, e não é para isso que
    ele existe.
  */
  const membro = await requireMember();

  if (!membro.ok) {
    return NextResponse.json({ message: membro.message }, { status: membro.status });
  }

  let corpo: unknown;

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  const externalId = String((corpo as { externalId?: unknown })?.externalId ?? "").trim();

  if (!/^\d+$/.test(externalId)) {
    return NextResponse.json(
      { message: "Informe o número do atendimento na HubSpot." },
      { status: 400 }
    );
  }

  const supabase = isSharedWorkspace() ? await createSupabaseServerClient() : null;

  /*
    Sem banco não há onde copiar, e a resposta honesta é dizer isso. Servir
    direto a URL da HubSpot funcionaria hoje e quebraria amanhã, que é o defeito
    que este caminho inteiro existe para evitar.
  */
  if (!supabase) {
    return NextResponse.json(
      { message: "Anexos precisam do espaço compartilhado configurado." },
      { status: 503 }
    );
  }

  const guardados = await lerDoBalde(supabase, externalId);

  if (guardados) return NextResponse.json({ anexos: guardados, origem: "cópia" });

  /* Daqui para baixo se fala com a HubSpot, e é aqui que o freio vale. */
  const liberado = await requireHubSpotRead();

  if (!liberado.ok) {
    return NextResponse.json({ message: liberado.message }, { status: liberado.status });
  }

  /*
    O fio, quando o atendimento já sabe qual é.

    Quem entrou pela caixa guarda `raw.threadId`, e com ele a consulta por
    `associatedTicketId` deixa de ser necessária: uma requisição em vez de duas,
    e a que sai só servia para descobrir um identificador já gravado aqui.
  */
  const threadId = String((corpo as { threadId?: unknown })?.threadId ?? "").trim();

  try {
    const daHubSpot = /^\d+$/.test(threadId)
      ? await hubspotConversationService.anexosDoFio(threadId)
      : await hubspotConversationService.anexosDoAtendimento(externalId);

    if (daHubSpot.length === 0) {
      await marcarVazio(supabase, externalId);

      return NextResponse.json({ anexos: [], origem: "hubspot" });
    }

    const copiados = await copiar(supabase, externalId, daHubSpot);

    return NextResponse.json({
      anexos: copiados.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      origem: "hubspot",
    });
  } catch (error) {
    if (error instanceof HubSpotFailure) {
      return NextResponse.json(
        { message: error.message },
        { status: STATUS_POR_FALHA[error.kind] }
      );
    }

    console.error("ANEXOS_ERROR", error);

    return NextResponse.json({ message: "Não foi possível buscar os anexos." }, { status: 502 });
  }
}

type Cliente = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

/**
 * O que já foi copiado, com URL nossa.
 *
 * Devolve `null` quando a pasta nunca foi preenchida — que é diferente de ter
 * sido preenchida com nada, e é por isso que existe a marca.
 */
async function lerDoBalde(supabase: Cliente, externalId: string): Promise<AnexoServido[] | null> {
  const { data, error } = await supabase.storage.from(BALDE).list(externalId, { limit: 100 });

  if (error || !data || data.length === 0) return null;

  if (data.some((item) => item.name === MARCA_VAZIO)) return [];

  const anexos: AnexoServido[] = [];

  for (const item of data) {
    const caminho = `${externalId}/${item.name}`;

    const { data: assinada } = await supabase.storage
      .from(BALDE)
      .createSignedUrl(caminho, VALIDADE_SEGUNDOS);

    if (!assinada?.signedUrl) continue;

    anexos.push({
      fileId: item.name.split("__")[0] ?? item.name,
      name: nomeOriginal(item.name),
      isImage: (item.metadata?.mimetype ?? "").startsWith("image/"),
      url: assinada.signedUrl,
    });
  }

  /*
    Ordem estável, porque a lista do balde e a da HubSpot não coincidem: sem
    isto os mesmos anexos apareceriam em ordem diferente antes e depois da
    cópia, e quem olhasse duas vezes acharia que mudou alguma coisa.
  */
  return anexos.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

async function marcarVazio(supabase: Cliente, externalId: string) {
  await supabase.storage
    .from(BALDE)
    .upload(`${externalId}/${MARCA_VAZIO}`, new Blob([""], { type: "text/plain" }), {
      upsert: true,
    });
}

/**
 * Baixa da CDN da HubSpot e sobe para o balde.
 *
 * A CDN não é a API: baixar dali não consome a cota de requisições do app
 * privado nem passa pelo servidor que atende cliente. O que se quer evitar é
 * repetir o pedido **à API** a cada exibição, e é isso que a cópia resolve.
 *
 * Arquivo que falhar é pulado, e os outros seguem: perder a leva inteira por
 * causa de um anexo grande seria jogar fora o que já veio.
 */
async function copiar(
  supabase: Cliente,
  externalId: string,
  anexos: { fileId: string; name: string; isImage: boolean; url: string }[]
): Promise<AnexoServido[]> {
  const servidos: AnexoServido[] = [];

  for (const anexo of anexos) {
    try {
      const resposta = await fetch(anexo.url);

      if (!resposta.ok) continue;

      const conteudo = await resposta.blob();
      const caminho = `${externalId}/${anexo.fileId}__${paraChave(anexo.name)}`;

      const { error } = await supabase.storage.from(BALDE).upload(caminho, conteudo, {
        contentType: resposta.headers.get("content-type") ?? "application/octet-stream",
        upsert: true,
      });

      if (error) {
        console.error("ANEXO_UPLOAD_ERROR", anexo.fileId, error.message);
        continue;
      }

      const { data: assinada } = await supabase.storage
        .from(BALDE)
        .createSignedUrl(caminho, VALIDADE_SEGUNDOS);

      if (assinada?.signedUrl) {
        servidos.push({ ...anexo, url: assinada.signedUrl });
      }
    } catch (error) {
      console.error("ANEXO_COPIA_ERROR", anexo.fileId, error);
    }
  }

  return servidos;
}

/**
 * O nome do cliente, guardado sem perder nada.
 *
 * A chave do objeto não é texto livre — espaço e acento não atravessam — e a
 * primeira versão trocava tudo por hífen. O efeito aparecia só na **segunda**
 * leitura: "erro eberick.png" voltava como "erro-eberick.png", então o mesmo
 * anexo tinha nome diferente antes e depois da cópia, e quem procurasse o
 * arquivo que o cliente citou não acharia.
 *
 * Codificado, ele atravessa inteiro e volta idêntico.
 */
function paraChave(nome: string): string {
  return encodeURIComponent(nome).slice(0, 200);
}

function nomeOriginal(guardado: string): string {
  const separador = guardado.indexOf("__");
  const codificado = separador === -1 ? guardado : guardado.slice(separador + 2);

  /*
    Decodificar pode falhar se algo além da nossa gravação puser arquivo aqui.
    Nome estranho é melhor que tela quebrada.
  */
  try {
    return decodeURIComponent(codificado);
  } catch {
    return codificado;
  }
}
