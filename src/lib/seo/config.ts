// src/lib/seo/config.ts
// ⚙️ Configuração SEO central — fonte única de verdade para domínio, nome,
// descrições e imagens padrão. Usado por layout, sitemap, robots e JSON-LD.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://prolite.com.br';

export const SITE_NAME = 'Pro-Lite';

export const SITE_TITLE =
  'Pro-Lite — Capas, Leashes, Decks e Acessórios de Surf';

export const SITE_DESCRIPTION =
  'Pro-Lite: 40 anos projetando e construindo equipamentos de surf. Capas, leashes, decks, quilhas, parafinas e acessórios com fabricação própria em São Paulo. Até 10x sem juros.';

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

// Imagem OG padrão (1200x630) — colocar em /public/images/og-default.jpg
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

export const CONTACT = {
  // Mãos Acessórios (dona da marca Pro-Lite) — ver src/lib/config/company.ts
  email: 'atendimento@maosacessorios.com.br',
  phone: '+55-11-2294-6300',
  addressLocality: 'São Paulo',
  addressRegion: 'SP',
  addressCountry: 'BR',
};

export const SOCIAL_LINKS: string[] = [
  // Adicionar quando existirem:
  // 'https://www.instagram.com/<perfil-oficial-pro-lite>',
];

/** Junta caminho relativo ao domínio canónico, sem barras duplicadas. */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Remove HTML e trunca texto para meta description (máx. 160 chars). */
export function toMetaDescription(
  input: string | undefined | null,
  fallback: string = SITE_DESCRIPTION,
): string {
  if (!input) return fallback;
  const text = input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return fallback;
  return text.length > 157 ? `${text.slice(0, 157).trimEnd()}…` : text;
}
