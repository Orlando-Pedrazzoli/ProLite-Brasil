// src/lib/config/homeBanners.ts
// ═══════════════════════════════════════════════════════════════
// POSIÇÕES DE BANNER DA HOME — configuração partilhada
// ═══════════════════════════════════════════════════════════════
// Fonte única para:
//   • src/lib/models/Banner.ts            (enum de posições/slots)
//   • src/app/admin/configuracoes/page.tsx (formulário + medidas)
//   • componentes da home que consomem /api/banners?position=…
//
// Cada posição diz: que campos o admin preenche, se há slots fixos
// (e o link de cada um) e as medidas recomendadas por campo.
// Para acrescentar uma secção com imagem gerida no admin, basta
// adicionar uma entrada aqui + o componente que a lê.

import {
  BENTO_SLOTS,
  BENTO_SIZE_HINTS,
  BENTO_SIZE_LABEL,
} from '@/lib/config/bentoSlots';

export type BannerPosition = 'hero' | 'bento' | 'category_banner' | 'store';

export interface SizeHint {
  desktop: string;
  /** Ausente = a posição não tem imagem mobile */
  mobile?: string;
}

export interface SlotConfig {
  value: string;
  label: string;
  /** Link fixo (o admin não edita) */
  href?: string;
  hints: SizeHint;
}

export interface PositionConfig {
  value: BannerPosition;
  label: string;
  /** Texto de ajuda mostrado no formulário */
  help?: string;
  /** Slots fixos (um banner por slot); ausente = lista livre ordenável */
  slots?: SlotConfig[];
  /** Campo de subtítulo (só faz sentido onde há texto sobre a imagem) */
  hasSubtitle?: boolean;
  /** Campo de link editável (false quando o link é fixo ou não existe) */
  hasLink: boolean;
  /** Campo de imagem mobile */
  hasMobile: boolean;
  /** Medidas quando a posição não tem slots */
  hints?: SizeHint;
}

export const HOME_BANNER_POSITIONS: PositionConfig[] = [
  {
    value: 'hero',
    label: 'Hero Carousel (topo)',
    help: 'Vários banners em rotação (10 s). A ordem define a sequência.',
    hasLink: true,
    hasMobile: true,
    hints: {
      desktop: '1920×800 px — paisagem 12:5 (JPG/WebP, ≤300 KB)',
      mobile: '1080×1350 px — retrato 4:5 (JPG/WebP, ≤250 KB)',
    },
  },
  {
    value: 'bento',
    label: 'Bento de categorias (6 cards — abaixo de "Compre por categoria")',
    help: 'Cada categoria tem um card fixo. O Título é a frase grande do card e o Subtítulo a linha de apoio; o texto fica no canto inferior esquerdo sobre um gradiente escuro — deixa essa zona da foto mais limpa. O card 1 (Capas) é o grande, 2×2; os outros cinco são padrão. Todos em paisagem 3:2.',
    hasSubtitle: true,
    hasLink: false,
    hasMobile: true,
    slots: BENTO_SLOTS.map((s, i) => ({
      value: s.slot,
      label: `${i + 1}. ${s.label} — ${BENTO_SIZE_LABEL[s.size]}`,
      href: s.href,
      hints: BENTO_SIZE_HINTS[s.size],
    })),
  },
  {
    value: 'category_banner',
    label: 'Banners de categoria (Capas Refletivas e Leashes — largura total)',
    help: 'Um banner largo acima do carrossel de produtos de cada categoria. Sem imagem mobile, a desktop é recortada ao centro — num banner tão largo isso corta muito, por isso vale a pena enviar a versão mobile.',
    hasLink: false,
    hasMobile: true,
    slots: [
      {
        value: 'capas',
        label: 'Capas Refletivas',
        href: '/categoria/capas-refletivas',
        hints: {
          desktop: '1920×700 px — paisagem 2.74:1 (JPG/WebP, ≤350 KB)',
          mobile: '1080×1080 px — quadrado 1:1 (JPG/WebP, ≤200 KB)',
        },
      },
      {
        value: 'leashes',
        label: 'Leashes',
        href: '/categoria/leashes',
        hints: {
          desktop: '1920×700 px — paisagem 2.74:1 (JPG/WebP, ≤350 KB)',
          mobile: '1080×1080 px — quadrado 1:1 (JPG/WebP, ≤200 KB)',
        },
      },
    ],
  },
  {
    value: 'store',
    label: 'Fotos da loja (carrossel em "Nós somos a Pro-Lite")',
    help: 'Lista livre: adiciona quantas fotos quiseres; a ordem define a sequência do carrossel. O Título serve de texto alternativo (acessibilidade/SEO).',
    hasLink: false,
    hasMobile: false,
    hints: {
      desktop: '1200×900 px — paisagem 4:3 (JPG/WebP, ≤250 KB)',
    },
  },
];

export const HOME_BANNER_POSITION_VALUES = HOME_BANNER_POSITIONS.map(
  p => p.value,
) as BannerPosition[];

/** Todos os valores de slot válidos, em todas as posições */
export const HOME_BANNER_SLOT_VALUES = Array.from(
  new Set(
    HOME_BANNER_POSITIONS.flatMap(p => (p.slots ?? []).map(s => s.value)),
  ),
);

export function getPosition(value: string | undefined | null) {
  return HOME_BANNER_POSITIONS.find(p => p.value === value);
}

export function getSlot(position: string | undefined | null, slot: string | undefined | null) {
  return getPosition(position)?.slots?.find(s => s.value === slot);
}
