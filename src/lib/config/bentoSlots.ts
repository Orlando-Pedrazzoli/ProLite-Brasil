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
// Os cards têm PROPORÇÃO fixa (não altura fixa), por isso as medidas
// valem em qualquer largura de ecrã:
//   • wide   (3/6 colunas) → 5:4 paisagem  (num ecrã 1920 ≈ 936×749 px)
//   • narrow (2/6 colunas) → 5:6 retrato   (num ecrã 1920 ≈ 618×742 px)
// Enviar ~1.6× o tamanho exibido para ficar nítido em ecrãs retina.
// No mobile todos os cards são 4:3 em largura total (~360px).
export const BENTO_SIZE_HINTS: Record<
  BentoSize,
  { desktop: string; mobile: string }
> = {
  wide: {
    desktop: '1500×1200 px — paisagem 5:4 (JPG/WebP, ≤350 KB)',
    mobile: '800×600 px — 4:3 (JPG/WebP, ≤150 KB) — opcional',
  },
  narrow: {
    desktop: '1000×1200 px — retrato 5:6 (JPG/WebP, ≤300 KB)',
    mobile: '800×600 px — 4:3 (JPG/WebP, ≤150 KB) — opcional',
  },
};
