import { readFile } from 'node:fs/promises';

const MAX_PDF_PAGES = 100;
const PDF_SCALE = 2;

async function renderPdf(data: Uint8Array) {
  const { createCanvas } = await import('@napi-rs/canvas');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  const pages: Buffer[] = [];
  for (let n = 1; n <= Math.min(pdf.numPages, MAX_PDF_PAGES); n++) {
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: PDF_SCALE });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: canvas.getContext('2d') as unknown as CanvasRenderingContext2D, viewport }).promise;
    pages.push(canvas.toBuffer('image/png'));
  }
  return pages;
}

async function toPng(data: Buffer) {
  const { createCanvas, loadImage } = await import('@napi-rs/canvas');
  const image = await loadImage(data);
  const canvas = createCanvas(image.width, image.height);
  canvas.getContext('2d').drawImage(image, 0, 0);
  return canvas.toBuffer('image/png');
}

/** Cada página de PDF, ou a própria imagem, vira um PNG para o modelo ler. */
export async function loadPageImages(path: string) {
  const data = await readFile(path);
  return /\.pdf$/i.test(path) ? renderPdf(new Uint8Array(data)) : [await toPng(data)];
}
