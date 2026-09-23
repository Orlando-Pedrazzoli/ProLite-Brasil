// src/lib/utils/prepareImageUpload.ts
// Prepara imagens no browser antes do upload:
//  - reduz fotos grandes (lado maior até 2400px) para não bater no limite de 4.5 MB da Vercel
//  - converte para WEBP mantendo transparência
//  - formatos que o browser não consegue decodificar (ex.: HEIC no Chrome/Windows)
//    seguem como estão e o servidor/Cloudinary converte

const MAX_DIMENSION = 2400;
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024; // abaixo disto envia o original
const QUALITY = 0.9;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode-failed'));
    };
    img.src = url;
  });
}

export async function prepareImageUpload(file: File): Promise<File> {
  // GIF pode ser animado — não mexer
  if (file.type === 'image/gif') return file;
  // Pequena o suficiente → envia original (preserva qualidade máxima)
  if (file.size <= SKIP_BELOW_BYTES) return file;

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    // Browser não suporta o formato (ex.: HEIC) → deixa o servidor tratar
    return file;
  }

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight),
  );
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise(resolve =>
    canvas.toBlob(resolve, 'image/webp', QUALITY),
  );
  if (!blob || blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagem';
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}
