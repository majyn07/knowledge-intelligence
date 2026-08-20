import { panelToSvg } from "./panelSvg";
import type { PanelSpec } from "./panelSpec";
import type { PanelResult } from "./runPanel";

/**
 * O painel como PNG.
 *
 * Só esta parte precisa do navegador: o desenho é feito por `panelToSvg`, que
 * é puro, e aqui ele só é rasterizado. Separar as duas coisas é o que permite
 * conferir a imagem por teste em vez de abri-la e olhar.
 *
 * PNG e não o próprio SVG porque o destino é uma apresentação ou uma conversa,
 * onde colar vetor costuma não funcionar.
 */
export async function panelToPng(
  spec: PanelSpec,
  result: PanelResult
): Promise<Blob | null> {
  const svg = panelToSvg(spec, result);

  /*
    Data URI e não `URL.createObjectURL`: o SVG carregado por blob conta como
    documento externo e o canvas fica "sujo", o que faz `toBlob` falhar por
    segurança. `encodeURIComponent` cobre o acento, que é frequente aqui.
  */
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => resolve(null);
    element.src = url;
  });

  if (!image) return null;

  // Dobro da escala: colado numa apresentação, o texto continua nítido.
  const escala = 2;

  const canvas = document.createElement("canvas");
  canvas.width = image.width * escala;
  canvas.height = image.height * escala;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.scale(escala, escala);
  context.drawImage(image, 0, 0);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
