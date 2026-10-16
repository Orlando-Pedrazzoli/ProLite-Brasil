// src/components/home/CapasRefletivasBanner.tsx
import Image from 'next/image';
import Link from 'next/link';
import FeaturedProducts from '@/components/home/FeaturedProducts';

// Slug da categoria no admin — ajustar aqui se for diferente
const CATEGORY_SLUG = 'capas-refletivas';
const CATEGORY_HREF = `/categoria/${CATEGORY_SLUG}`;
const PRODUCTS_LIMIT = 4;

export default function CapasRefletivasBanner() {
  return (
    <section className='pt-2'>
      {/* Banner alinhado ao bento: container-home (mesma largura e
          margens laterais de 16px) + cantos arredondados rounded-2xl.
          Proporção 1920×700. */}
      <div className='container-home'>
        <Link
          href={CATEGORY_HREF}
          aria-label='Ver todas as capas refletivas'
          className='group relative block w-full overflow-hidden rounded-2xl aspect-[1920/700] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand'
        >
          <Image
            src='/images/banner_capas.jpg'
            alt='Capas refletivas Pro-Lite para pranchas de surf'
            fill
            sizes='100vw'
            quality={85}
            className='object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100'
          />
        </Link>
      </div>

      {/* Carousel de produtos da categoria */}
      <FeaturedProducts
        eyebrow='Capas'
        title='Capas Refletivas'
        fetchUrl={`/api/products?limit=${PRODUCTS_LIMIT}&sort=-createdAt&isActive=true&categorySlug=${CATEGORY_SLUG}`}
      />
    </section>
  );
}
