// src/lib/config/bentoSlots.ts
// ═══════════════════════════════════════════════════════════════
// BENTO DE CATEGORIAS (home) — configuração partilhada
// ═══════════════════════════════════════════════════════════════
// Usado por:
//   • src/components/home/CategoryBento.tsx  (render na home)
//   • src/lib/config/homeBanners.ts          (posição "bento" no admin)
//
// Layout (baseado no "Feature Bento" do 21st.dev): grelha de 3 colunas
// no desktop, 6 cards —
//   ┌───────────────┬───────┐
//   │               │   2   │
//   │   1 (hero)    ├───────┤
//   │               │   3   │
//   ├───────┬───────┼───────┤
//   │   4   │   5   │   6   │
//   └───────┴───────┴───────┘
// Cada card tem um slot FIXO: o link e a posição na grelha não mudam —
// o admin só troca a imagem (+ título/subtítulo). Para adicionar,
// remover ou reordenar cards, altera-se SÓ este ficheiro.

export type BentoSlot =
  | 'capas'
  | 'leashes'
  | 'decks'
  | 'quilhas'
  | 'acessorios'
  | 'lifestyle';

/** hero = ocupa 2 colunas × 2 linhas; standard = 1 × 1 */
export type BentoSize = 'hero' | 'standard';

export interface BentoSlotConfig {
  slot: BentoSlot;
  /** Eyebrow do card (nome da categoria) */
  label: string;
  /** Rota fixa da categoria */
  href: string;
  size: BentoSize;
  /** Título default quando o admin não preenche */
  defaultTitle: string;
  /** Subtítulo default quando o admin não preenche */
  defaultSubtitle: string;
}

// A ORDEM define a posição na grelha (ver diagrama acima).
export const BENTO_SLOTS: BentoSlotConfig[] = [
  {
    slot: 'capas',
    label: 'Capas',
    href: '/categoria/capas',
    size: 'hero',
    defaultTitle: 'Proteção total para a sua prancha',
    defaultSubtitle:
      'Capas refletivas, acolchoadas e de viagem — 40 anos de fabrico nacional.',
  },
  {
    slot: 'leashes',
    label: 'Leashes',
    href: '/categoria/leashes',
    size: 'standard',
    defaultTitle: 'Leashes que não falham',
    defaultSubtitle: 'Uretano, giratórios duplos e velcro reforçado.',
  },
  {
    slot: 'decks',
    label: 'Decks',
    href: '/categoria/decks',
    size: 'standard',
    defaultTitle: 'Aderência onde importa',
    defaultSubtitle: 'Decks EVA com grip real e durabilidade de verdade.',
  },
  {
    slot: 'quilhas',
    label: 'Quilhas',
    href: '/categoria/quilhas',
    size: 'standard',
    defaultTitle: 'Controle e velocidade',
    defaultSubtitle: 'Quilhas para encaixe FCS II e Futures.',
  },
  {
    slot: 'acessorios',
    label: 'Acessórios',
    href: '/categoria/acessorios',
    size: 'standard',
    defaultTitle: 'Tudo o resto para o surf',
    defaultSubtitle: 'Parafinas, racks, reparos e mais.',
  },
  {
    slot: 'lifestyle',
    label: 'Lifestyle',
    href: '/categoria/lifestyle',
    size: 'standard',
    defaultTitle: 'Do mar para a rua',
    defaultSubtitle: 'Camisetas, bonés e o estilo Pro-Lite fora da água.',
  },
];

export const BENTO_SLOT_VALUES = BENTO_SLOTS.map(s => s.slot) as BentoSlot[];

export function getBentoSlot(slot: string | undefined | null) {
  return BENTO_SLOTS.find(s => s.slot === slot);
}

export const BENTO_SIZE_LABEL: Record<BentoSize, string> = {
  hero: 'card grande (2×2)',
  standard: 'card padrão',
};

// ───── Medidas recomendadas por tamanho de card ─────
// Os cards standard têm proporção fixa 3:2; o hero ocupa 2 colunas e
// 2 linhas (+ gap), o que dá também ≈3:2. Como a proporção é fixa, as
// medidas valem em qualquer largura de ecrã:
//   • hero     → num ecrã 1920 ≈ 1252×840 px
//   • standard → num ecrã 1920 ≈  618×412 px
// Enviar ~1.5× o tamanho exibido para ficar nítido em ecrãs retina.
// No mobile (1 coluna, ~360px) todos os cards são 4:3.
export const BENTO_SIZE_HINTS: Record<
  BentoSize,
  { desktop: string; mobile: string }
> = {
  hero: {
    desktop: '1800×1200 px — paisagem 3:2 (JPG/WebP, ≤400 KB)',
    mobile: '800×600 px — 4:3 (JPG/WebP, ≤150 KB) — opcional',
  },
  standard: {
    desktop: '1200×800 px — paisagem 3:2 (JPG/WebP, ≤250 KB)',
    mobile: '800×600 px — 4:3 (JPG/WebP, ≤150 KB) — opcional',
  },
};
