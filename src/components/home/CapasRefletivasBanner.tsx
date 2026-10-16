// src/components/home/CapasRefletivasBanner.tsx
// Banner largo + carrossel de Capas Refletivas.
// Imagem gerida no admin (posição "Banners de categoria", slot `capas`);
// a imagem de /public é só fallback enquanto não houver banner no admin.
import CategoryBannerSection from '@/components/home/CategoryBannerSection';

export default function CapasRefletivasBanner() {
  return (
    <CategoryBannerSection
      slot='capas'
      fallbackSrc='/images/banner_capas.jpg'
      fallbackAlt='Capas refletivas Pro-Lite para pranchas de surf'
      ariaLabel='Ver todas as capas refletivas'
      eyebrow='Capas'
      title='Capas Refletivas'
      categorySlug='capas-refletivas'
      limit={4}
    />
  );
}
