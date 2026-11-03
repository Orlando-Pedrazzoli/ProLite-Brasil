// src/app/indexnow/[key]/route.ts
// 📡 Ficheiro de verificação IndexNow, servido em /indexnow/<INDEXNOW_KEY>.txt
// (é o keyLocation enviado em cada ping — ver src/lib/seo/indexnow.ts).
// O conteúdo tem de ser exatamente a chave, em text/plain.
// Qualquer outro nome devolve 404 para não revelar a chave.

import { NextResponse } from 'next/server';
import { getIndexNowKey } from '@/lib/seo/indexnow';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const expected = getIndexNowKey();
  const requested = key.endsWith('.txt') ? key.slice(0, -4) : key;

  if (!expected || requested !== expected) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(expected, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
