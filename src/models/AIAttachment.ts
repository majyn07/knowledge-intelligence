/**
 * Um arquivo enviado ao modelo junto com o prompt.
 *
 * Existe porque nem toda evidência é texto que alguém vai transcrever: o
 * atendimento chega em PDF, a proposta chega em documento, e a captura de tela
 * chega em imagem. Extrair texto no navegador resolveria o PDF digital e
 * falharia justamente no escaneado, que é o que mais aparece.
 *
 * **O arquivo não é guardado em lugar nenhum.** Ele existe durante o pedido,
 * vai ao provedor, e é descartado com a resposta. O produto fica com o que foi
 * extraído e revisado, não com o documento. Que é o que mantém o acervo leve
 * e evita virar repositório de arquivo sem querer.
 */
export interface AIAttachment {
  /** Tipo declarado do conteúdo, como `application/pdf` ou `image/png`. */
  mimeType: string;
  /** O conteúdo em base64, sem o prefixo `data:`. */
  data: string;
}

/**
 * Os tipos que o modelo lê como documento.
 *
 * Vive aqui, e não junto do schema da rota, porque o navegador precisa da
 * mesma lista para decidir o que oferecer no seletor de arquivo, e este
 * arquivo não carrega `zod`, então importá-lo não arrasta a biblioteca inteira
 * para o pacote do cliente.
 *
 * Uma lista só, pelo motivo de sempre: duas listas do mesmo vocabulário
 * divergem, e a divergência apareceria como a tela aceitando um arquivo que o
 * servidor recusa.
 *
 * Arquivo de texto não entra: ele é lido no navegador e vai como texto, porque
 * base64 de um `.txt` custa um terço a mais de tokens para entregar
 * exatamente o mesmo conteúdo. Aqui ficam só os formatos que precisam ser
 * **vistos**, e não lidos.
 */
export const ATTACHMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

/**
 * Teto do anexo, antes do base64.
 *
 * Oito megabytes cobrem folgadamente um PDF de atendimento e param bem antes
 * do limite de pedido do provedor. Que o base64 alcança um terço mais cedo do
 * que o tamanho do arquivo sugere.
 */
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
