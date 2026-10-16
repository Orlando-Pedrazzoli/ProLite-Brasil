// src/components/home/LeashesBanner.tsx
// Banner largo + carrossel de Leashes.
// Imagem gerida no admin (posição "Banners de categoria", slot `leashes`);
// a imagem de /public é só fallback enquanto não houver banner no admin.
import CategoryBannerSection from '@/components/home/CategoryBannerSection';

export default function LeashesBanner() {
  return (
    <CategoryBannerSection
      slot='leashes'
      fallbackSrc='/images/banner_leashes.jpg'
      fallbackAlt='Leashes Pro-Lite para surf'
      ariaLabel='Ver todos os leashes'
      eyebrow='Essenciais'
      title='Leashes'
      categorySlug='leashes'
      limit={4}
    />
  );
}
