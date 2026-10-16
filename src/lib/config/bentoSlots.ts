// src/lib/config/bentoSlots.ts
// ═══════════════════════════════════════════════════════════════
// BENTO DE CATEGORIAS (home) — configuração partilhada
// ═══════════════════════════════════════════════════════════════
// Usado por:
//   • src/components/home/CategoryBento.tsx  (render na home)
//   • src/app/admin/configuracoes/page.tsx   (formulário de banners)
//
// Cada card tem um slot FIXO: o link, a posição na grelha e as
// medidas recomendadas da imagem não mudam — o admin só troca a
// imagem (+ título/subtítulo). Para adicionar/remover um card,
// altera-se SÓ este ficheiro.

export type BentoSlot = 'capas' | 'leashes' | 'decks' | 'quilhas' | 'acessorios';

export type BentoSize = 'wide' | 'narrow';

export interface BentoSlotConfig {
  slot: BentoSlot;
  /** Eyebrow do card (nome da categoria) */
  label: string;
  /** Rota fixa da categoria */
  href: string;
  /** Largura na grelha desktop (6 colunas): wide = 3, narrow = 2 */
  size: BentoSize;
  /** Título default quando o admin não preenche */
  defaultTitle: string;
  /** Subtítulo default quando o admin não preenche */
  defaultSubtitle: string;
}

export const BENTO_SLOTS: BentoSlotConfig[] = [
  {
    slot: 'capas',
    label: 'Capas',
    href: '/categoria/capas',
    size: 'wide',
    defaultTitle: 'Proteção total para a sua prancha',
    defaultSubtitle:
      'Capas refletivas, acolchoadas e de viagem — 40 anos de fabrico nacional.',
  },
  {
    slot: 'leashes',
    label: 'Leashes',
    href: '/categoria/leashes',
    size: 'wide',
    defaultTitle: 'Leashes que não falham',
    defaultSubtitle:
      'Cordão de uretano, giratórios duplos e velcro reforçado para qualquer condição.',
  },
  {
    slot: 'decks',
    label: 'Decks',
    href: '/categoria/decks',
    size: 'narrow',
    defaultTitle: 'Aderência onde importa',
    defaultSubtitle: 'Decks EVA com grip real e durabilidade de verdade.',
  },
  {
    slot: 'quilhas',
    label: 'Quilhas',
    href: '/categoria/quilhas',
    size: 'narrow',
    defaultTitle: 'Controle e velocidade',
    defaultSubtitle: 'Quilhas para encaixe FCS II e Futures.',
  },
  {
    slot: 'acessorios',
    label: 'Acessórios',
    href: '/categoria/acessorios',
    size: 'narrow',
    defaultTitle: 'Tudo o resto para o surf',
    defaultSubtitle: 'Parafinas, racks, reparos e mais.',
  },
];

export const BENTO_SLOT_VALUES = BENTO_SLOTS.map(s => s.slot) as BentoSlot[];

export function getBentoSlot(slot: string | undefined | null) {
  return BENTO_SLOTS.find(s => s.slot === slot);
}

// ───── Medidas recomendadas por tamanho de card ─────
// A área da imagem do card tem altura fixa (26rem ≈ 416px no desktop).
// Numa grelha max-w-7xl (1248px úteis) com gap de 16px:
//   • wide  (3/6 colunas) ≈ 616 × 416 px  → enviar o dobro: 1240×830 (3:2)
//   • narrow (2/6 colunas) ≈ 405 × 416 px → enviar o dobro:  830×830 (1:1)
// No mobile o card ocupa a largura toda (~360px) com 18rem (288px) de
// altura → imagem mobile opcional em 800×640 (5:4).
export const BENTO_SIZE_HINTS: Record<
  BentoSize,
  { desktop: string; mobile: string }
> = {
  wide: {
    desktop: '1240×830 px — paisagem 3:2 (JPG/WebP, ≤250 KB)',
    mobile: '800×640 px — 5:4 (JPG/WebP, ≤150 KB) — opcional',
  },
  narrow: {
    desktop: '830×830 px — quadrado 1:1 (JPG/WebP, ≤200 KB)',
    mobile: '800×640 px — 5:4 (JPG/WebP, ≤150 KB) — opcional',
  },
};
