// src/lib/seo/config.ts
// ⚙️ Configuração SEO central — fonte única de verdade para domínio, nome,
// Domínio canónico = www.prolite.com.br (Production na Vercel; o apex faz
// 308 → www). NEXT_PUBLIC_SITE_URL na Vercel tem de ser o www.
// descrições e imagens padrão. Usado por layout, sitemap, robots e JSON-LD.
// Dados de empresa (endereço, telefone, redes) vêm de src/lib/config/company.ts
// para não haver duas fontes a divergir.

import { company } from '@/lib/config/company';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.prolite.com.br';

export const SITE_NAME = 'Pro-Lite';

export const SITE_TITLE =
  'Pro-Lite — Capas, Leashes, Decks e Acessórios de Surf';

export const SITE_DESCRIPTION =
  'Pro-Lite: 40 anos projetando e construindo equipamentos de surf. Capas, leashes, decks, quilhas, parafinas e acessórios com fabricação própria em São Paulo. Até 10x sem juros.';

/** H1 da home — única keyword principal + diferencial (fabricação própria). */
export const HOME_H1 =
  'Capas, Leashes, Decks e Acessórios de Surf com Fabricação Própria';

export const SITE_KEYWORDS = [
  'pro-lite',
  'pro-lite brasil',
  'capa de prancha',
  'capa de prancha de surf',
  'leash de surf',
  'cordinha de prancha',
  'deck de surf',
  'quilhas',
  'parafina',
  'acessórios de surf',
  'equipamentos de surf',
  'capa de sup',
];

// Imagem OG padrão (1200x630) — ficheiro em /public/images/og-default.jpg
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

// Logo usado no schema Organization (ficheiro existente em /public)
export const LOGO_URL = `${SITE_URL}/web-app-manifest-512x512.png`;

/** Token da meta tag do Google Search Console (opcional — preferir DNS TXT). */
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '';

export const CONTACT = {
  email: company.email,
  phone: `+55${company.phone.replace(/\D/g, '')}`, // E.164: +551122946300
  whatsapp: `+${company.whatsapp}`,
  streetAddress: `${company.address.street}, ${company.address.number}`,
  neighborhood: company.address.neighborhood,
  addressLocality: company.address.city,
  addressRegion: company.address.state,
  postalCode: company.address.cep,
  addressCountry: 'BR',
  // Coordenadas da loja (Rua Dom Andrés Lamas, 57 — Tatuapé)
  geo: { latitude: -23.5351221, longitude: -46.5735528 },
  // Horário em formato schema.org OpeningHoursSpecification
  openingHours: [
    {
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    },
  ],
};

/**
 * Perfis oficiais para `sameAs` do schema Organization.
 * Preenchidos UMA vez em company.social — aparecem aqui, no footer e no
 * contacto automaticamente. Vazios são ignorados.
 */
export const SOCIAL_LINKS: string[] = (
  [
    company.social.instagram,
    company.social.facebook,
    company.social.youtube,
  ] as string[]
).filter(url => url.trim().length > 0);

/** Junta caminho relativo ao domínio canónico, sem barras duplicadas. */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const META_DESCRIPTION_MAX = 157;

/**
 * Remove HTML e trunca texto para meta description (máx. ~160 chars).
 * O corte é feito no último espaço antes do limite para nunca partir
 * uma palavra ao meio; se houver um fim de frase próximo, corta aí.
 */
export function toMetaDescription(
  input: string | undefined | null,
  fallback: string = SITE_DESCRIPTION,
): string {
  if (!input) return fallback;
  const text = input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return fallback;
  if (text.length <= META_DESCRIPTION_MAX) return text;

  const slice = text.slice(0, META_DESCRIPTION_MAX);

  // Preferir terminar numa frase completa se estiver nos últimos 40% do limite
  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
  );
  if (sentenceEnd >= META_DESCRIPTION_MAX * 0.6) {
    return slice.slice(0, sentenceEnd + 1);
  }

  // Senão, cortar na última palavra inteira
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[,;:\-–—]+$/, '').trimEnd()}…`;
}
