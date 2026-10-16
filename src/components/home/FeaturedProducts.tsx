'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import SectionHeading from '@/components/home/SectionHeading';

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  thumbnail?: string;
  isOnSale?: boolean;
  isNewArrival?: boolean;
  isFeatured?: boolean;
  salePercentage?: number;
  // ═══ FAMILY FIELDS ═══
  productFamily?: string;
  variantType?: 'color' | 'size' | 'both';
  color?: string;
  colorCode?: string;
  colorCode2?: string;
  size?: string;
  isMainVariant?: boolean;
}

interface FeaturedProductsProps {
  title: string;
  /** Linha pequena acima do título (opcional) */
  eyebrow?: string;
  fetchUrl: string;
}

export default function FeaturedProducts({
  title,
  eyebrow,
  fetchUrl,
}: FeaturedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(fetchUrl);
        const data = await res.json();
        if (data.success) setProducts(data.products);
      } catch {
        console.error('Erro ao carregar produtos');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [fetchUrl]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <section className='py-8'>
        <div className='container-home'>
          <SectionHeading eyebrow={eyebrow} title={title} />
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className='bg-gray-100 rounded-lg animate-pulse aspect-[3/4]'
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className='py-8'>
      <div className='container-home'>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          action={
            products.length > 4 ? (
              <div className='hidden md:flex gap-2'>
                <button
                  onClick={() => scroll('left')}
                  aria-label='Anteriores'
                  className='w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:border-gray-900 transition-colors'
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => scroll('right')}
                  aria-label='Próximos'
                  className='w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:border-gray-900 transition-colors'
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : undefined
          }
        />

        <div
          ref={scrollRef}
          className='flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2'
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map(product => (
            <div
              key={product._id}
              className='flex-shrink-0 w-[48%] sm:w-[31%] md:w-[23.5%] snap-start'
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
