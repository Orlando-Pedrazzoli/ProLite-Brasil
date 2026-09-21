// src/components/home/LeashesBanner.tsx
import Image from 'next/image';
import Link from 'next/link';
import FeaturedProducts from '@/components/home/FeaturedProducts';

// Slug da categoria no admin — ajustar aqui se for diferente
const CATEGORY_SLUG = 'leashes';
const CATEGORY_HREF = `/categoria/${CATEGORY_SLUG}`;
const PRODUCTS_LIMIT = 4;

export default function LeashesBanner() {
  return (
    <section style={{ width: '100%' }}>
      {/* Banner ponta a ponta — proporção 1920×700 */}
      <Link
        href={CATEGORY_HREF}
        aria-label='Ver todos os leashes'
        className='group block focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#1E90FF]'
        style={{
          position: 'relative',
          display: 'block',
          width: '100%',
          aspectRatio: '1920 / 700',
          overflow: 'hidden',
        }}
      >
        <Image
          src='/images/banner_leashes.jpg'
          alt='Leashes Pro-Lite para surf'
          fill
          sizes='100vw'
          quality={85}
          className='transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100'
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
      </Link>

      {/* Carousel de produtos da categoria */}
      <FeaturedProducts
        title='Leashes'
        fetchUrl={`/api/products?limit=${PRODUCTS_LIMIT}&sort=-createdAt&isActive=true&categorySlug=${CATEGORY_SLUG}`}
      />
    </section>
  );
}
