/**
 * A pessoa está escrevendo agora.
 *
 * Um atalho de tecla só não pode disparar enquanto alguém digita: "/" e "?" são
 * caracteres comuns em português, e sem esta guarda escrever "e/ou" numa
 * descrição abriria a paleta no meio da frase. As setas têm o mesmo problema de
 * outro jeito: navegar a lista com ↑ enquanto o cursor está no campo de busca
 * tiraria a pessoa de onde ela está escrevendo.
 *
 * Vive em `lib` porque passou a ter dois consumidores, e duas guardas de
 * digitação divergem: uma delas esqueceria o `contentEditable`, e o editor de
 * artigo é justamente um.
 */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
