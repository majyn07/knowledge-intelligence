import { NextResponse } from "next/server";

import { isSharedWorkspace } from "@/lib/supabase/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * A imagem que alguém põe num artigo escrito aqui.
 *
 * 1.771 dos 1.822 artigos do portal têm imagem: o acervo é feito de prints. Até
 * aqui o editor sabia formatar texto e não sabia acrescentar uma figura, o que
 * o deixava capaz de corrigir uma frase e incapaz de documentar um passo.
 *
 * Passa pelo servidor, e não direto do navegador, pela mesma razão do
 * interruptor: a sessão vem do cookie por um caminho que já funciona. E porque
 * o teto e os tipos aceitos precisam ser conferidos **antes** de o arquivo
 * subir, e não depois.
 *
 * As imagens do portal continuam onde estão, servidas pela HubSpot: elas são do
 * artigo publicado e não se movem. Este caminho é para o que nasce aqui, e
 * **nada disto vai para a HubSpot**.
 */

const BALDE = "article-images";

/** Cinco megabytes. Print de tela cabe folgado; vídeo colado por engano, não. */
const TETO_BYTES = 5 * 1024 * 1024;

const TIPOS = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  if (!isSharedWorkspace()) {
    return NextResponse.json(
      { message: "Sem espaço compartilhado, não há onde guardar a imagem." },
      { status: 503 }
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ message: "Sem espaço compartilhado." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Entre para enviar imagens." }, { status: 401 });
  }

  let arquivo: File | null = null;

  try {
    const formulario = await request.formData();
    const valor = formulario.get("arquivo");

    if (valor instanceof File) arquivo = valor;
  } catch {
    return NextResponse.json({ message: "Envio inválido." }, { status: 400 });
  }

  if (!arquivo) {
    return NextResponse.json({ message: "Nenhuma imagem no envio." }, { status: 400 });
  }

  const extensao = TIPOS.get(arquivo.type);

  /*
    O tipo é conferido aqui e no balde. Aqui a recusa vira frase legível; lá é a
    garantia, porque quem chama a rota pode mentir sobre o tipo declarado.
  */
  if (!extensao) {
    return NextResponse.json(
      { message: "Formato não aceito. Use PNG, JPEG, GIF ou WebP." },
      { status: 415 }
    );
  }

  if (arquivo.size > TETO_BYTES) {
    return NextResponse.json(
      { message: `A imagem passa de ${Math.round(TETO_BYTES / 1024 / 1024)} MB.` },
      { status: 413 }
    );
  }

  /*
    Nome sorteado, e não o nome original.

    Dois prints chamados `image.png` se sobrescreveriam, e o segundo trocaria a
    figura de um artigo que ninguém abriu. O nome de origem também costuma
    carregar caminho da máquina de quem enviou.
  */
  const caminho = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage
    .from(BALDE)
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });

  if (error) {
    console.error("ARTICLE_IMAGE_UPLOAD_ERROR", error);

    return NextResponse.json({ message: error.message }, { status: 502 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BALDE).getPublicUrl(caminho);

  return NextResponse.json({ url: publicUrl });
}
