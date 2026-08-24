import {
  ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  type AttachmentType,
} from "@/models/AIAttachment";

/**
 * O que fazer com o arquivo que a pessoa escolheu.
 *
 * Dois caminhos, e a diferença é econômica antes de ser técnica:
 *
 * - **texto** é lido no navegador e segue como texto. Mandar um `.csv` em
 *   base64 custaria um terço a mais de tokens para entregar exatamente o
 *   mesmo conteúdo.
 * - **anexo** é o que precisa ser *visto*: PDF e imagem. Extrair texto de PDF
 *   no navegador resolveria o digital e falharia no escaneado — que é o que
 *   mais chega de um suporte.
 *
 * O tipo declarado pelo navegador **não basta**. `.md` costuma chegar com
 * `type` vazio, e `.csv` chega ora como `text/csv`, ora como
 * `application/vnd.ms-excel`. Por isso a extensão decide junto: recusar um
 * arquivo legítimo porque o sistema operacional não soube nomeá-lo é pior que
 * aceitar pela extensão.
 */

export type FileRole = "texto" | "anexo";

export interface FileVerdict {
  role: FileRole;
  /** Só para anexo: o tipo que vai ao provedor, já dentro do vocabulário. */
  mimeType?: AttachmentType;
}

const TEXT_EXTENSIONS = ["txt", "md", "markdown", "csv", "tsv", "json", "log", "htm", "html"];

const EXTENSION_TO_ATTACHMENT: Record<string, AttachmentType> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** O `accept` do seletor, montado do mesmo vocabulário que a checagem usa. */
export const FILE_ACCEPT = [
  ...TEXT_EXTENSIONS.map((extension) => `.${extension}`),
  ...Object.keys(EXTENSION_TO_ATTACHMENT).map((extension) => `.${extension}`),
  ...ATTACHMENT_TYPES,
  "text/plain",
].join(",");

function extensionOf(name: string): string {
  const ponto = name.lastIndexOf(".");
  return ponto < 0 ? "" : name.slice(ponto + 1).toLowerCase();
}

/**
 * Decide o caminho do arquivo, ou `null` quando ele não serve.
 *
 * `null` em vez de exceção porque arquivo não suportado é escolha comum, e não
 * erro de programa — quem chama transforma em frase na tela.
 */
export function classifyFile(name: string, type: string): FileVerdict | null {
  const extensao = extensionOf(name);
  const declarado = type.trim().toLowerCase();

  /*
    A extensão vem primeiro porque é a que o sistema operacional não erra. O
    tipo declarado entra como segunda chance, para o arquivo que chegou sem
    extensão nenhuma.
  */
  const porExtensao = EXTENSION_TO_ATTACHMENT[extensao];
  const porTipo = (ATTACHMENT_TYPES as readonly string[]).includes(declarado)
    ? (declarado as AttachmentType)
    : undefined;

  const anexo = porExtensao ?? porTipo;

  if (anexo) return { role: "anexo", mimeType: anexo };

  if (TEXT_EXTENSIONS.includes(extensao) || declarado.startsWith("text/")) {
    return { role: "texto" };
  }

  return null;
}

/**
 * O anexo cabe no pedido?
 *
 * O teto vale só para o que vai em base64. Arquivo de texto é cortado pelo
 * limite de `source`, que é outro número e outro motivo.
 */
export function attachmentTooLarge(bytes: number): boolean {
  return bytes > MAX_ATTACHMENT_BYTES;
}

/** O tamanho como se diz para alguém, e não como o disco conta. */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type ReadFile =
  | { role: "texto"; text: string }
  | { role: "anexo"; mimeType: AttachmentType; data: string };

/**
 * Lê o arquivo pelo caminho que a classificação escolheu.
 *
 * Fica separado da classificação de propósito: decidir o caminho é lógica e se
 * testa, ler bytes é navegador e não se testa. A conversão para base64 passa
 * pelo `FileReader` em vez de montar a string a partir do `ArrayBuffer` —
 * `String.fromCharCode` sobre um megabyte estoura a pilha de argumentos, e o
 * caminho manual precisaria de um laço em blocos para evitar isso.
 */
export async function readFileForFill(file: File): Promise<ReadFile | null> {
  const verdict = classifyFile(file.name, file.type);

  if (!verdict) return null;

  if (verdict.role === "texto") {
    return { role: "texto", text: await file.text() };
  }

  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler o arquivo."));
    reader.onload = () => {
      const resultado = String(reader.result ?? "");
      // `data:<tipo>;base64,<conteúdo>` — só o conteúdo interessa ao provedor.
      resolve(resultado.slice(resultado.indexOf(",") + 1));
    };

    reader.readAsDataURL(file);
  });

  return { role: "anexo", mimeType: verdict.mimeType!, data };
}
