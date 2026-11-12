// src/app/page.tsx
// Home — canonical explícito + title otimizado para a keyword principal.
// O único <h1> da página é server-rendered no topo do <main>, visualmente
// oculto (sr-only): o hero é um carrossel de imagens carregado no cliente,
// sem texto, por isso o H1 fica aqui — no HTML inicial, para crawlers e
// leitores de ecrã, sem interferir no layout. Todas as secções seguintes
// usam <h2> via SectionHeading.

import type { Metadata } from 'next';
import { HOME_H1 } from '@/lib/seo/config';
import { getHomeNewArrivals } from '@/lib/home/getHomeProducts';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import WhatsAppButton from '@/components/layout/WhatsAppButton';
import HeroBanner from '@/components/home/HeroBanner';
import ShopByCategory from '@/components/home/ShopByCategory';
import CategoryBento from '@/components/home/CategoryBento';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import ReviewsCarousel from '@/components/home/ReviewsCarousel';
import StoreShowcase from '@/components/home/StoreShowcase';
import CapasRefletivasBanner from '@/components/home/CapasRefletivasBanner';
import LeashesBanner from '@/components/home/LeashesBanner';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

// A vitrine lê o Mongo em cada request para o HTML já sair com os cards.
export const dynamic = 'force-dynamic';

export default async function Home() {
  let newArrivals: Awaited<ReturnType<typeof getHomeNewArrivals>> = [];
  try {
    newArrivals = await getHomeNewArrivals();
  } catch (error) {
    console.error('Erro ao carregar novidades da home:', error);
  }

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <h1 className='sr-only'>{HOME_H1}</h1>
        <HeroBanner />
        <ShopByCategory />
        <CategoryBento />
        <FeaturedProducts
          eyebrow='Acabou de chegar'
          title='Novidades'
          initialProducts={newArrivals}
          fetchUrl='/api/products?limit=8&sort=home&isActive=true&isNewArrival=true'
          // Completa com os publicados mais recentes quando há poucas
          // "novidades" marcadas — o carrossel em loop precisa de matéria
          fallbackUrl='/api/products?limit=12&sort=-createdAt&isActive=true'
        />
        <CapasRefletivasBanner />
        <LeashesBanner />
        <StoreShowcase />
        <ReviewsCarousel />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
