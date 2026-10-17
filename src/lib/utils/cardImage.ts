// src/lib/utils/cardImage.ts
// ═══════════════════════════════════════════════════════════════
// IMAGEM DO PRODUCT CARD — enquadramento uniforme via Cloudinary
// ═══════════════════════════════════════════════════════════════
// Problema: cada foto de produto chega com uma margem branca
// diferente; no card, umas ficam grandes e outras minúsculas.
//
// Solução (sem tocar no ficheiro original, que continua a servir a
// galeria do produto): no card pede-se ao Cloudinary uma versão
//   1. e_trim      → remove a margem uniforme (branca) à volta
//   2. c_pad 4:5   → encaixa o que sobrou numa moldura 4:5 com fundo
//                    branco, sem cortar nada
// Resultado: o produto ocupa o máximo do card em TODOS os produtos,
// com a mesma proporção, independentemente de como a foto foi tirada.
//
// Imagens fora do Cloudinary (fallbacks em /public) passam intactas.
// O loader (src/lib/cloudinaryLoader.ts) acrescenta depois f_auto,
// q_auto e w_ — as transformações encadeiam-se no URL.

export const CARD_ASPECT = '4:5';

const UPLOAD = '/image/upload/';
// Tolerância 10 do trim: ignora ruído de compressão JPEG nas margens.
export const CARD_TRANSFORM = `e_trim:10/c_pad,ar_${CARD_ASPECT},b_white`;

export function cardImage(src: string | undefined | null): string {
  if (!src) return '';
  if (!src.includes('res.cloudinary.com') || !src.includes(UPLOAD)) return src;
  // Já transformada (evita duplicar quando a mesma URL passa duas vezes)
  if (src.includes(CARD_TRANSFORM)) return src;
  const [base, rest] = src.split(UPLOAD);
  return `${base}${UPLOAD}${CARD_TRANSFORM}/${rest}`;
}
