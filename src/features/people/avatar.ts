/**
 * O retrato da pessoa.
 *
 * Fica **embutido no próprio perfil**, como data URI, e não num serviço de
 * arquivos. Um retrato de 128 pixels comprimido cabe em poucos quilobytes, e
 * guardá-lo na mesma linha significa que ele chega junto com a pessoa: sem
 * segunda requisição, sem bucket para provisionar, sem política de acesso
 * separada para manter em dia.
 *
 * O limite abaixo é o que torna essa escolha defensável. Passar dele mudaria
 * a conta — aí sim valeria um serviço de arquivos, e essa decisão seria
 * tomada na hora, não agora.
 */

/** Lado do quadrado gravado, em pixels. */
export const AVATAR_SIZE = 128;

/** Teto do que se aceita gravar, já comprimido. */
export const AVATAR_MAX_BYTES = 24 * 1024;

export const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp";

export type AvatarError = "tipo" | "tamanho" | "leitura";

export const avatarErrorMessage: Record<AvatarError, string> = {
  tipo: "Envie uma imagem PNG, JPEG ou WebP.",
  tamanho:
    "A imagem ficou grande demais mesmo depois de reduzida. Tente uma foto mais simples ou com menos detalhe.",
  leitura: "Não foi possível ler esta imagem.",
};

/** As iniciais que aparecem enquanto ninguém enviou retrato. */
export function initialsOf(name: string): string {
  const partes = name.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Uma cor estável a partir do nome.
 *
 * Determinística de propósito: a mesma pessoa tem sempre a mesma cor, em
 * qualquer máquina e em qualquer sessão. Sorteá-la faria o avatar mudar a cada
 * carregamento, e cor que muda não distingue ninguém.
 */
export function avatarHue(name: string): number {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }

  return hash;
}

/**
 * Reduz a imagem a um quadrado pequeno e devolve o data URI.
 *
 * Recorta pelo centro em vez de espremer: o retrato de alguém deformado é pior
 * que o retrato de alguém aparado.
 *
 * Roda no navegador — depende de `Image` e `canvas` — e por isso é assíncrona
 * e devolve resultado em vez de lançar: a falha aqui é previsível, não
 * excepcional.
 */
export async function resizeAvatar(
  file: File
): Promise<{ ok: true; dataUrl: string } | { ok: false; error: AvatarError }> {
  if (!AVATAR_ACCEPT.split(",").includes(file.type)) {
    return { ok: false, error: "tipo" };
  }

  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("imagem ilegível"));
      element.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const context = canvas.getContext("2d");
    if (!context) return { ok: false, error: "leitura" };

    // Recorte central: o menor lado vira o quadrado.
    const lado = Math.min(image.naturalWidth, image.naturalHeight);
    const x = (image.naturalWidth - lado) / 2;
    const y = (image.naturalHeight - lado) / 2;

    context.drawImage(image, x, y, lado, lado, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    /*
      WebP primeiro pelo tamanho; JPEG quando o navegador não gerar WebP —
      `toDataURL` devolve PNG silenciosamente nesse caso, e PNG de foto passa
      folgado do teto.
    */
    const webp = canvas.toDataURL("image/webp", 0.82);
    const dataUrl = webp.startsWith("data:image/webp")
      ? webp
      : canvas.toDataURL("image/jpeg", 0.82);

    if (dataUrl.length > AVATAR_MAX_BYTES) {
      return { ok: false, error: "tamanho" };
    }

    return { ok: true, dataUrl };
  } catch {
    return { ok: false, error: "leitura" };
  } finally {
    URL.revokeObjectURL(url);
  }
}
