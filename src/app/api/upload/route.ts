// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/services/cloudinary';
import { requireAdminGuard } from '@/lib/auth/guards';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Vercel rejeita corpos acima de ~4.5 MB antes de chegar aqui (413).
// O cliente comprime antes de enviar; este limite é a rede de segurança.
const MAX_BYTES = 4 * 1024 * 1024;

// Mapa extensão → MIME, para quando o browser/Windows envia file.type vazio
// (acontece com .heic, .jfif, .avif e alguns ficheiros descarregados da web)
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  pjpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
};

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
}

export async function POST(request: NextRequest) {
  // Upload é exclusivo do admin (antes estava aberto a qualquer pessoa)
  const guard = await requireAdminGuard();
  if (guard.response) return guard.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'prolite-brasil';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhum ficheiro enviado' },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Ficheiro demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo 4 MB.`,
        },
        { status: 413 },
      );
    }

    const ext = getExtension(file.name);
    // Se o browser não informou o tipo, deduz pela extensão
    const mime = file.type || EXT_TO_MIME[ext] || '';

    if (!mime.startsWith('image/')) {
      return NextResponse.json(
        {
          success: false,
          error: `Formato não suportado (${ext || 'desconhecido'}). Usa JPG, PNG, WEBP, AVIF, GIF ou HEIC.`,
        },
        { status: 415 },
      );
    }

    // SVG pode conter scripts — não aceitar em upload de produtos
    if (mime === 'image/svg+xml') {
      return NextResponse.json(
        { success: false, error: 'SVG não é permitido. Usa PNG ou JPG.' },
        { status: 415 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileUri = `data:${mime};base64,${buffer.toString('base64')}`;

    const result = await uploadImage(fileUri, folder, {
      originalExt: ext || mime.split('/')[1],
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Upload error:', error);
    const message =
      error instanceof Error ? error.message : 'Erro ao fazer upload';
    return NextResponse.json(
      { success: false, error: `Erro ao fazer upload: ${message}` },
      { status: 500 },
    );
  }
}
