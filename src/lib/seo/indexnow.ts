// src/lib/seo/indexnow.ts
// 📡 IndexNow — notifica Bing, Yandex, Seznam, Naver (e parceiros) no
// momento em que uma URL é criada/alterada/removida, em vez de esperar
// pelo rastreio. O Google NÃO usa IndexNow (sitemap + GSC continuam a ser
// o caminho para ele).
//
// Como funciona:
//   1. Chave: variável INDEXNOW_KEY na Vercel (8–128 chars hex/alfanum).
//      Gerar com: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
//   2. O motor valida a chave lendo https://prolite.com.br/indexnow/<key>.txt — servido
//      por src/app/indexnow/[key]/route.ts (não é preciso ficheiro em /public).
//   3. pingIndexNow(['/produtos/x']) → POST em api.indexnow.org, que replica
//      para todos os motores participantes.
//
// Sem INDEXNOW_KEY definida, tudo é no-op silencioso (dev/preview).
// Nunca lança — falhas de rede não podem partir o save do admin.

import { SITE_URL, absoluteUrl } from './config';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS_PER_REQUEST = 10_000;

export function getIndexNowKey(): string {
  return process.env.INDEXNOW_KEY?.trim() || '';
}

export function isIndexNowEnabled(): boolean {
  return getIndexNowKey().length >= 8;
}

export interface IndexNowResult {
  ok: boolean;
  status?: number;
  skipped?: 'disabled' | 'no-urls';
  error?: string;
}

/**
 * Envia uma lista de caminhos relativos (ou URLs absolutas do próprio domínio).
 * Fire-and-forget: chamar sem await nos handlers, ou com await em scripts.
 */
export async function pingIndexNow(
  paths: string | string[],
): Promise<IndexNowResult> {
  const key = getIndexNowKey();
  if (key.length < 8) return { ok: false, skipped: 'disabled' };

  const list = (Array.isArray(paths) ? paths : [paths])
    .filter(Boolean)
    .map(p => (p.startsWith('http') ? p : absoluteUrl(p)))
    .filter(u => u.startsWith(SITE_URL));

  const urlList = Array.from(new Set(list)).slice(0, MAX_URLS_PER_REQUEST);
  if (urlList.length === 0) return { ok: false, skipped: 'no-urls' };

  const host = new URL(SITE_URL).host;

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${SITE_URL}/indexnow/${key}.txt`,
        urlList,
      }),
      // Não bloquear o request principal por mais de alguns segundos
      signal: AbortSignal.timeout(5000),
    });

    // 200 OK, 202 Accepted (chave ainda a validar) — ambos são sucesso
    const ok = res.status === 200 || res.status === 202;
    if (!ok) {
      console.warn(`[indexnow] HTTP ${res.status} para ${urlList.length} URL(s)`);
    }
    return { ok, status: res.status };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.warn('[indexnow] falhou:', error);
    return { ok: false, error };
  }
}

/** Atalhos semânticos para os handlers do admin. */
export const indexNow = {
  product: (slug: string) =>
    pingIndexNow([`/produtos/${slug}`, '/produtos', '/sitemap.xml']),
  category: (slug: string) =>
    pingIndexNow([`/categoria/${slug}`, '/sitemap.xml']),
  brand: (slug: string) => pingIndexNow([`/marca/${slug}`, '/sitemap.xml']),
  blogPost: (slug: string) =>
    pingIndexNow([`/blog/${slug}`, '/blog', '/sitemap.xml']),
};
