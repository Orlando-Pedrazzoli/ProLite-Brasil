// src/components/home/CategoryBento.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import SectionHeading from '@/components/home/SectionHeading';
import {
  BENTO_SLOTS,
  type BentoSlot,
  type BentoSlotConfig,
} from '@/lib/config/bentoSlots';

// ═══════════════════════════════════════════════════════════════
// BENTO DE CATEGORIAS — home, logo abaixo de <ShopByCategory />
// ═══════════════════════════════════════════════════════════════
// Grelha "bento" de 5 cards, um por categoria-raiz. Cada card tem
// um SLOT fixo (link + posição na grelha definidos em
// src/lib/config/bentoSlots.ts). O admin troca a imagem, o título e
// o subtítulo em /admin/configuracoes (posição "Bento de categorias").
//
// Dados: GET /api/banners?position=bento&active=true
//   → banners: { slot, title, subtitle, image, mobileImage }
//
// Sem banner num slot → o card continua visível e clicável com um
// fallback (gradiente chumbo → brand + nome da categoria). Nunca
// mostra imagem partida nem "buraco" na grelha.
//
// Baseado no "Bento Grid" do 21st.dev (FUIBentoGridDark), reescrito
// para next/image, next/link, tokens de cor da Pro-Lite e sem o
// painel com backdrop-blur de altura fixa do original.

interface BentoBanner {
  _id: string;
  slot?: BentoSlot;
  title: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
}

interface CategoryBentoProps {
  eyebrow?: string;
  title?: string;
}

// ───── Card individual ─────
function BentoCard({
  config,
  banner,
}: {
  config: BentoSlotConfig;
  banner?: BentoBanner;
}) {
  const [errored, setErrored] = useState(false);
  const hasImage = !!banner?.image && !errored;
  const mobileSrc = banner?.mobileImage?.trim()
    ? banner.mobileImage
    : banner?.image;

  const title = banner?.title?.trim() || config.defaultTitle;
  const subtitle = banner?.subtitle?.trim() || config.defaultSubtitle;

  return (
    <motion.div
      initial='idle'
      whileHover='active'
      variants={{ idle: {}, active: {} }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl',
        'bg-chumbo text-white ring-1 ring-black/5 shadow-sm',
        'transform-gpu transition-shadow duration-300 hover:shadow-xl hover:shadow-brand/10',
        config.size === 'wide' ? 'lg:col-span-3' : 'lg:col-span-2',
      )}
    >
      <Link
        href={config.href}
        aria-label={`Ver ${config.label}`}
        className={cn(
          'relative block focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand',
          // Proporção fixa (como no original do 21st, cards altos):
          // wide 5:4 e narrow 5:6 dão a MESMA altura de linha na grelha
          // (3 col vs 2 col). No mobile (1 coluna) são todos 4:3.
          // Assim as medidas recomendadas no admin batem certo em
          // qualquer largura de ecrã.
          'aspect-[4/3]',
          config.size === 'wide' ? 'lg:aspect-[5/4]' : 'lg:aspect-[5/6]',
        )}
      >
        {/* ───── Imagem (desktop + mobile) ───── */}
        {hasImage ? (
          <>
            <div className='md:hidden absolute inset-0'>
              <Image
                src={mobileSrc as string}
                alt={banner?.title || config.label}
                fill
                sizes='100vw'
                className='object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100'
                onError={() => setErrored(true)}
              />
            </div>
            <div className='hidden md:block absolute inset-0'>
              <Image
                src={banner?.image as string}
                alt={banner?.title || config.label}
                fill
                sizes={
                  config.size === 'wide'
                    ? '(max-width: 1024px) 100vw, 50vw'
                    : '(max-width: 1024px) 100vw, 33vw'
                }
                className='object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100'
                onError={() => setErrored(true)}
              />
            </div>
          </>
        ) : (
          // ───── Fallback sem imagem ─────
          <div className='absolute inset-0 bg-gradient-to-br from-chumbo via-chumbo-light to-brand-darker'>
            <span className='absolute right-6 top-6 select-none font-mono text-[7rem] leading-none font-bold text-white/5 md:text-[9rem]'>
              {config.label.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Gradiente para legibilidade do texto */}
        <div className='absolute inset-0 bg-gradient-to-t from-chumbo-dark/95 via-chumbo-dark/40 to-transparent' />

        {/* ───── Texto ───── */}
        <div className='absolute inset-x-0 bottom-0 p-6 md:p-10'>
          <span className='inline-flex items-center rounded-full bg-brand px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white'>
            {config.label}
          </span>
          <h3 className='mt-3 text-2xl/8 font-semibold tracking-tight text-white md:text-[1.7rem] md:leading-9'>
            {title}
          </h3>
          <p className='mt-2 max-w-[34rem] text-sm/6 text-white/75'>
            {subtitle}
          </p>
          <span className='mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-300 transition-colors group-hover:text-white'>
            Ver {config.label.toLowerCase()}
            <ArrowUpRight
              size={16}
              className='transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
            />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

// ───── Skeleton ─────
function BentoSkeleton() {
  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-6'>
      {BENTO_SLOTS.map(s => (
        <div
          key={s.slot}
          className={cn(
            'aspect-[4/3] animate-pulse rounded-2xl bg-gray-100',
            s.size === 'wide'
              ? 'lg:col-span-3 lg:aspect-[5/4]'
              : 'lg:col-span-2 lg:aspect-[5/6]',
          )}
        />
      ))}
    </div>
  );
}

export default function CategoryBento({
  eyebrow = 'Catálogo',
  title = 'Equipamento feito para durar',
}: CategoryBentoProps) {
  const [banners, setBanners] = useState<BentoBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch('/api/banners?position=bento&active=true');
        const data = await res.json();
        if (data.success && Array.isArray(data.banners)) {
          setBanners(data.banners);
        }
      } catch {
        console.error('Erro ao carregar bento de categorias');
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  // Um banner por slot. A API já vem ordenada por `order`; se o admin
  // tiver mais do que um ativo no mesmo slot, fica o primeiro.
  const bySlot = useMemo(() => {
    const map: Partial<Record<BentoSlot, BentoBanner>> = {};
    for (const b of banners) {
      if (b.slot && !map[b.slot]) map[b.slot] = b;
    }
    return map;
  }, [banners]);

  return (
    <section className='py-10 md:py-14'>
      {/* container-home (globals.css): mesma largura de todas as
          secções da home; padding lateral = gap entre os cards. */}
      <div className='container-home'>
        <SectionHeading eyebrow={eyebrow} title={title} />

        {loading ? (
          <BentoSkeleton />
        ) : (
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-6'>
            {BENTO_SLOTS.map(config => (
              <BentoCard
                key={config.slot}
                config={config}
                banner={bySlot[config.slot]}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
