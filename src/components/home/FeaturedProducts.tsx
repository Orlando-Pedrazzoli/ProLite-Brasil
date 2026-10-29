// src/components/home/FeaturedProducts.tsx
// v2: CARROSSEL CONTÍNUO EM LOOP INFINITO (pedido do Maurício).
//
// Como funciona:
//   • a lista de produtos é renderizada 3× seguidas; quando o scroll passa
//     a largura de UM conjunto, subtraímos essa largura — o salto é
//     invisível e o loop nunca acaba (nos dois sentidos);
//   • o avanço é feito por requestAnimationFrame com velocidade em px/s
//     (independente do refresh rate), diretamente em scrollLeft — por isso
//     o utilizador continua a poder arrastar com o dedo/trackpad;
//   • PAUSA quando: o cursor está em cima (hover), há toque/arrasto em
//     curso, um elemento dentro tem foco (teclado), a secção está fora do
//     ecrã (IntersectionObserver), a aba está em segundo plano, ou após
//     clicar nas setas — e RETOMA alguns segundos depois da interação;
//   • respeita prefers-reduced-motion (fica estático, sem autoplay);
//   • com poucos produtos (tudo cabe no ecrã) não duplica nem anima.
//
// Removido o snap-mandatory: com o movimento contínuo o snap "prendia"
// o scroll a cada cartão.
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  /** Velocidade do loop em px/segundo (padrão 38 — calmo, dá para ler o preço) */
  speed?: number;
  /** Segundos de pausa após uma interação (setas, toque, arrasto) */
  resumeAfter?: number;
}

const COPIES = 3; // conjuntos renderizados para o loop (mínimo 3)
const MIN_PRODUCTS_TO_LOOP = 3;

export default function FeaturedProducts({
  title,
  eyebrow,
  fetchUrl,
  speed = 38,
  resumeAfter = 3,
}: FeaturedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null); // 1.º conjunto (mede a largura de um ciclo)

  // Estado de autoplay em refs (não re-renderiza a cada frame)
  const hoverRef = useRef(false);
  const touchRef = useRef(false);
  const focusRef = useRef(false);
  const visibleRef = useRef(true);
  const resumeAtRef = useRef(0);
  const reducedMotionRef = useRef(false);

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

  // Loop só quando há produtos suficientes E um conjunto é mais largo que
  // o contentor (medido com ResizeObserver — muda com o tamanho do ecrã).
  const [overflows, setOverflows] = useState(false);
  const shouldLoop = products.length >= MIN_PRODUCTS_TO_LOOP && overflows;

  /** Pausa o autoplay por `resumeAfter` segundos (interação do utilizador). */
  const holdAutoplay = useCallback(() => {
    resumeAtRef.current = performance.now() + resumeAfter * 1000;
  }, [resumeAfter]);

  /** Mantém scrollLeft dentro do conjunto central — salto invisível. */
  const normalize = useCallback(() => {
    const el = scrollRef.current;
    const setWidth = setRef.current?.offsetWidth ?? 0;
    if (!el || !setWidth) return;
    if (el.scrollLeft >= setWidth * 2) el.scrollLeft -= setWidth;
    else if (el.scrollLeft < setWidth) el.scrollLeft += setWidth;
  }, []);

  // ── Mede se um conjunto transborda o contentor ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading || products.length < MIN_PRODUCTS_TO_LOOP) return;
    const measure = () => {
      const setWidth = setRef.current?.offsetWidth ?? 0;
      setOverflows(setWidth > el.clientWidth + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, products.length]);

  // ── Posição inicial no conjunto do meio (permite andar para trás) ──
  useEffect(() => {
    if (!shouldLoop || loading) return;
    const el = scrollRef.current;
    const setWidth = setRef.current?.offsetWidth ?? 0;
    if (el && setWidth && el.scrollLeft < setWidth) el.scrollLeft = setWidth;
  }, [shouldLoop, loading]);

  // ── prefers-reduced-motion ──
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => (reducedMotionRef.current = mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // ── Só anima quando a secção está no ecrã ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !shouldLoop) return;
    const io = new IntersectionObserver(
      ([entry]) => (visibleRef.current = entry.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shouldLoop, loading]);

  // ── Loop de animação ──
  useEffect(() => {
    if (!shouldLoop || loading) return;
    const el = scrollRef.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();
    let acc = 0; // acumula frações de pixel (scrollLeft é inteiro em alguns browsers)

    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000; // s (limita saltos após aba inativa)
      last = now;

      const setWidth = setRef.current?.offsetWidth ?? 0;
      const fits = setWidth <= el.clientWidth + 1; // tudo cabe: não anda
      const paused =
        reducedMotionRef.current ||
        hoverRef.current ||
        touchRef.current ||
        focusRef.current ||
        !visibleRef.current ||
        document.hidden ||
        now < resumeAtRef.current ||
        fits;

      if (!paused) {
        acc += speed * dt;
        const step = Math.floor(acc);
        if (step >= 1) {
          el.scrollLeft += step;
          acc -= step;
          normalize();
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shouldLoop, loading, speed, normalize]);

  // ── Setas: deslocam ~1 cartão e seguram o autoplay uns segundos ──
  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    holdAutoplay();
    const card = el.querySelector<HTMLElement>('[data-card]');
    const amount = card ? card.offsetWidth + 16 : 300; // 16 = gap-4
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  // Arrasto manual (dedo/trackpad): normaliza para o loop continuar sem fim
  const onScroll = () => {
    if (shouldLoop) normalize();
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

  const copies = shouldLoop ? COPIES : 1;

  return (
    <section className='py-8'>
      <div className='container-home'>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          action={
            shouldLoop ? (
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
          onScroll={onScroll}
          onMouseEnter={() => (hoverRef.current = true)}
          onMouseLeave={() => {
            hoverRef.current = false;
            holdAutoplay();
          }}
          onTouchStart={() => (touchRef.current = true)}
          onTouchEnd={() => {
            touchRef.current = false;
            holdAutoplay();
          }}
          onTouchCancel={() => {
            touchRef.current = false;
            holdAutoplay();
          }}
          onPointerDown={() => (touchRef.current = true)}
          onPointerUp={() => {
            touchRef.current = false;
            holdAutoplay();
          }}
          onPointerCancel={() => {
            touchRef.current = false;
            holdAutoplay();
          }}
          onPointerLeave={() => {
            // o botão pode ser largado fora do carrossel — nunca ficar "preso" em pausa
            touchRef.current = false;
          }}
          onFocusCapture={() => (focusRef.current = true)}
          onBlurCapture={e => {
            // só retoma quando o foco sai de TODO o carrossel
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              focusRef.current = false;
              holdAutoplay();
            }
          }}
          className={`flex gap-4 overflow-x-auto scrollbar-hide pb-2 ${
            shouldLoop ? '' : 'snap-x snap-mandatory'
          }`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          aria-label={title}
        >
          {Array.from({ length: copies }).map((_, copy) => (
            <div
              key={copy}
              ref={copy === 0 ? setRef : undefined}
              className='flex gap-4 flex-shrink-0'
            >
              {products.map(product => (
                <div
                  key={`${copy}-${product._id}`}
                  data-card
                  className={`flex-shrink-0 w-[42vw] sm:w-[31vw] md:w-[23.5vw] max-w-[300px] ${
                    shouldLoop ? '' : 'snap-start'
                  }`}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
