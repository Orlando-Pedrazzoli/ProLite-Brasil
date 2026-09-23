// src/lib/services/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Formatos que qualquer browser (e o otimizador do next/image) exibe sem problema.
// Tudo o que ficar fora desta lista (HEIC/HEIF do iPhone, TIFF, BMP, JFIF com
// extensão estranha, etc.) é convertido no upload para JPG ou PNG.
const WEB_SAFE_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);

// Formatos que podem ter transparência → convertem para PNG em vez de JPG
const ALPHA_FORMATS = new Set(['tif', 'tiff', 'bmp', 'ico']);

// Limite de lado maior guardado no Cloudinary (fotos de telemóvel têm 4000px+)
const MAX_DIMENSION = 2400;

export interface UploadImageOptions {
  /** Extensão original do ficheiro (sem ponto), usada para decidir a conversão */
  originalExt?: string;
}

export async function uploadImage(
  fileUri: string,
  folder: string = 'prolite-brasil',
  options: UploadImageOptions = {},
): Promise<{ url: string; publicId: string; format: string }> {
  const ext = (options.originalExt || '').toLowerCase();

  // Decide o formato final guardado
  let targetFormat: string | undefined;
  if (ext && !WEB_SAFE_FORMATS.has(ext)) {
    targetFormat = ALPHA_FORMATS.has(ext) ? 'png' : 'jpg';
  }

  const result = await cloudinary.uploader.upload(fileUri, {
    folder,
    resource_type: 'image',
    invalidate: true,
    ...(targetFormat ? { format: targetFormat } : {}),
    // Transformação de entrada: reduz fotos gigantes sem ampliar as pequenas
    transformation: [
      { width: MAX_DIMENSION, height: MAX_DIMENSION, crop: 'limit' },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
  };
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export { cloudinary };
