// src/app/api/upload/signature/route.ts
// Assina um upload direto browser → Cloudinary.
// Usado para os vídeos do hero: a Vercel rejeita corpos acima de ~4.5 MB,
// por isso o vídeo não pode passar por /api/upload como as imagens.
// O servidor só gera a assinatura (a API secret nunca sai daqui) e o
// ficheiro segue direto do browser do admin para o Cloudinary.
import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/services/cloudinary';
import { requireAdminGuard } from '@/lib/auth/guards';

export const runtime = 'nodejs';

// Pasta fixa no servidor: a assinatura só vale para esta pasta, o cliente
// não consegue escolher outro destino.
const VIDEO_FOLDER = 'prolite-brasil/banners/videos';

export async function POST() {
  const guard = await requireAdminGuard();
  if (guard.response) return guard.response;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { success: false, error: 'Cloudinary não configurado' },
      { status: 500 },
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { folder: VIDEO_FOLDER, timestamp },
    apiSecret,
  );

  return NextResponse.json({
    success: true,
    cloudName,
    apiKey,
    timestamp,
    folder: VIDEO_FOLDER,
    signature,
  });
}
