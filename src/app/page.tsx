// src/app/page.tsx
// Home — canonical explícito + title otimizado para a keyword principal.
// O único <h1> da página está em HomeIntro (server component, logo abaixo
// do hero); todas as secções seguintes usam <h2> via SectionHeading.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

import AnnouncementBar from '@/components/layout/AnnouncementBar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import WhatsAppButton from '@/components/layout/WhatsAppButton';
import HeroBanner from '@/components/home/HeroBanner';
import HomeIntro from '@/components/home/HomeIntro';
import ShopByCategory from '@/components/home/ShopByCategory';
import CategoryBento from '@/components/home/CategoryBento';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import ReviewsCarousel from '@/components/home/ReviewsCarousel';
import StoreShowcase from '@/components/home/StoreShowcase';
import CapasRefletivasBanner from '@/components/home/CapasRefletivasBanner';
import LeashesBanner from '@/components/home/LeashesBanner';

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <HeroBanner />
        <HomeIntro />
        <ShopByCategory />
        <CategoryBento />
        <FeaturedProducts
          eyebrow='Acabou de chegar'
          title='Novidades'
          fetchUrl='/api/products?limit=8&sort=-createdAt&isActive=true&isNewArrival=true'
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
