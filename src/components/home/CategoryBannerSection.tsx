// src/components/home/CategoryBannerSection.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import { getSlot } from '@/lib/config/homeBanners';

// ═══════════════════════════════════════════════════════════════
// BANNER LARGO DE CATEGORIA + carrossel de produtos
// ═══════════════════════════════════════════════════════════════
// Usado por CapasRefletivasBanner e LeashesBanner. A imagem vem do
// admin (/admin/configuracoes → posição "Banners de categoria", slot
// `capas` ou `leashes`), com versão mobile própria (1:1) para não
// cortar o banner 1920×700 num telemóvel.
//
// Dados: GET /api/banners?position=category_banner&active=true
// Sem banner no slot → cai na imagem estática de /public (fallback),
// para a secção nunca desaparecer.

interface CategoryBannerSectionProps {
  /** Slot em homeBanners.ts (define o link fixo) */
  slot: 'capas' | 'leashes';
  /** Imagem de /public usada enquanto o admin não enviar nenhuma */
  fallbackSrc: string;
  fallbackAlt: string;
  ariaLabel: string;
  /** Carrossel de produtos abaixo do banner */
  eyebrow?: string;
  title: string;
  categorySlug: string;
  limit?: number;
}

interface BannerDoc {
  _id: string;
  slot?: string;
  title: string;
  image: string;
  mobileImage?: string;
}

export default function CategoryBannerSection({
  slot,
  fallbackSrc,
  fallbackAlt,
  ariaLabel,
  eyebrow,
  title,
  categorySlug,
  limit = 4,
}: CategoryBannerSectionProps) {
  const [banner, setBanner] = useState<BannerDoc | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const res = await fetch(
          '/api/banners?position=category_banner&active=true',
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.banners)) {
          const found = (data.banners as BannerDoc[]).find(
            b => b.slot === slot,
          );
          if (found) setBanner(found);
        }
      } catch {
        console.error('Erro ao carregar banner de categoria');
      }
    };
    fetchBanner();
  }, [slot]);

  const href = getSlot('category_banner', slot)?.href ?? `/categoria/${categorySlug}`;
  const useAdmin = !!banner?.image && !errored;
  const desktopSrc = useAdmin ? (banner as BannerDoc).image : fallbackSrc;
  const mobileSrc = useAdmin
    ? (banner as BannerDoc).mobileImage?.trim() || (banner as BannerDoc).image
    : fallbackSrc;
  const alt = useAdmin ? (banner as BannerDoc).title : fallbackAlt;
  // Só com imagem mobile própria mudamos a proporção para 1:1;
  // caso contrário mantém-se a 1920×700 (recortada ao centro).
  const hasMobileVariant = useAdmin && !!(banner as BannerDoc).mobileImage?.trim();

  return (
    <section className='pt-2'>
      {/* Alinhado ao bento: container-home + rounded-2xl */}
      <div className='container-home'>
        <Link
          href={href}
          aria-label={ariaLabel}
          className={`group relative block w-full overflow-hidden rounded-2xl ${
            hasMobileVariant ? 'aspect-square md:aspect-[1920/700]' : 'aspect-[1920/700]'
          } focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand`}
        >
          {/* Mobile */}
          <div className='md:hidden absolute inset-0'>
            <Image
              src={mobileSrc}
              alt={alt}
              fill
              sizes='100vw'
              quality={85}
              className='object-cover object-center'
              onError={() => setErrored(true)}
            />
          </div>
          {/* Desktop */}
          <div className='hidden md:block absolute inset-0'>
            <Image
              src={desktopSrc}
              alt={alt}
              fill
              sizes='100vw'
              quality={85}
              className='object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100'
              onError={() => setErrored(true)}
            />
          </div>
        </Link>
      </div>

      <FeaturedProducts
        eyebrow={eyebrow}
        title={title}
        fetchUrl={`/api/products?limit=${limit}&sort=-createdAt&isActive=true&categorySlug=${categorySlug}`}
      />
    </section>
  );
}
