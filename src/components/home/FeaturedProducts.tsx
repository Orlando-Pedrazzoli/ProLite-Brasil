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
//   • PAUSA enquanto o cursor está por cima do carrossel, durante um
//     toque/arrasto, com foco por teclado, fora do ecrã, com a aba em
//     segundo plano, ou uns segundos depois das setas. Ao sair o cursor,
//     a animação RETOMA logo — sem ficar presa em hover;
//   • respeita prefers-reduced-motion (fica estático, sem autoplay);
//   • o número de cópias é calculado para encher pelo menos 2 larguras do
//     contentor (mínimo 3) — assim o loop funciona mesmo com 2 produtos;
//     com 1 produto não há carrossel;
//   • v2.1: se a busca principal devolver menos de `minItems` produtos
//     (ex.: só 2 marcados como "Novidade"), COMPLETA a fila com os
//     produtos publicados mais recentes (fallbackUrl) até `minItems` —
//     assim o carrossel tem sempre matéria para andar.
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
  /**
   * Produtos já lidos no servidor. Quando presentes, o HTML inicial
   * renderiza os cards (nome, foto, Pix, parcelas) e o fetch no
   * cliente é dispensado.
   */
  initialProducts?: Product[];
  /** Velocidade do loop em px/segundo (padrão 38 — calmo, dá para ler o preço) */
  speed?: number;
  /** Segundos de pausa após uma interação (setas, toque, arrasto) */
  resumeAfter?: number;
  /** Se a busca principal devolver menos de `minItems`, completa com estes */
  fallbackUrl?: string;
  /** Quantidade mínima de produtos desejada no carrossel (padrão 8) */
  minItems?: number;
}

const MIN_COPIES = 3; // conjuntos renderizados para o loop (mínimo 3)
const MIN_PRODUCTS_TO_LOOP = 2;

export default function FeaturedProducts({
  title,
  eyebrow,
  fetchUrl,
  initialProducts,
  speed = 38,
  resumeAfter = 3,
  fallbackUrl,
  minItems = 8,
}: FeaturedProductsProps) {
  const hasInitial = !!initialProducts && initialProducts.length > 0;
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [loading, setLoading] = useState(!hasInitial);

  const scrollRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null); // 1.º conjunto (mede a largura de um ciclo)

  // Estado de autoplay em refs (não re-renderiza a cada frame)
  const hoverRef = useRef(false);
  const touchRef = useRef(false);
  const focusRef = useRef(false);
  const visibleRef = useRef(true);
  const resumeAtRef = useRef(0);
  const reducedMotionRef = useRef(false);
  // Última posição do cursor. O mouseleave perde-se quando o scroll ou um
  // re-render mexe no DOM debaixo do ponteiro — daí a animação parar e não
  // voltar. No tick comparamos esta posição com o retângulo do carrossel.
  const pointerRef = useRef({ x: 0, y: 0, type: '', seen: false });

  useEffect(() => {
    if (hasInitial) return;

    const fetchProducts = async () => {
      try {
        const res = await fetch(fetchUrl);
        const data = await res.json();
        let list: Product[] = data.success ? data.products : [];

        // Poucos resultados (ex.: só 2 "novidades")? Completa com os mais
        // recentes publicados, sem repetir os que já estão na lista.
        if (fallbackUrl && list.length < minItems) {
          try {
            const r2 = await fetch(fallbackUrl);
            const d2 = await r2.json();
            if (d2.success) {
              const seen = new Set(list.map(p => p._id));
              for (const p of d2.products as Product[]) {
                if (list.length >= minItems) break;
                if (!seen.has(p._id)) {
                  seen.add(p._id);
                  list = [...list, p];
                }
              }
            }
          } catch {
            /* fallback é best-effort */
          }
        }
        setProducts(list);
      } catch {
        console.error('Erro ao carregar produtos');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [fetchUrl, fallbackUrl, minItems, hasInitial]);

  // Loop sempre que há 2+ produtos. O nº de cópias é medido com
  // ResizeObserver para que o conteúdo total encha ≥ 2 larguras do
  // contentor — com poucos produtos repete-se mais vezes.
  const [copies, setCopies] = useState(MIN_COPIES);
  const shouldLoop = products.length >= MIN_PRODUCTS_TO_LOOP;

  /** Pausa o autoplay por `resumeAfter` segundos (setas ou toque). */
  const holdAutoplay = useCallback(() => {
    resumeAtRef.current = performance.now() + resumeAfter * 1000;
  }, [resumeAfter]);

  // Posição do cursor, mesmo quando o evento não cai no carrossel.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;
      pointerRef.current.type = e.pointerType;
      pointerRef.current.seen = true;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  /** Mantém scrollLeft dentro do conjunto central — salto invisível. */
  const normalize = useCallback(() => {
    const el = scrollRef.current;
    const setWidth = setRef.current?.offsetWidth ?? 0;
    if (!el || !setWidth) return;
    if (el.scrollLeft >= setWidth * 2) el.scrollLeft -= setWidth;
    else if (el.scrollLeft < setWidth) el.scrollLeft += setWidth;
  }, []);

  // ── Quantas cópias são precisas para encher ≥ 2 larguras do contentor ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading || !shouldLoop) return;
    const measure = () => {
      const setWidth = setRef.current?.offsetWidth ?? 0;
      if (!setWidth) return;
      const needed = Math.ceil((el.clientWidth * 2) / setWidth) + 1;
      setCopies(Math.max(MIN_COPIES, Math.min(needed, 12)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, shouldLoop, products.length]);

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

      const point = pointerRef.current;
      if (point.seen && point.type === 'mouse') {
        const rect = el.getBoundingClientRect();
        const over =
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom;
        if (!over) {
          // Saiu: não deixar hover, clique ou foco de rato segurarem o loop.
          if (hoverRef.current) focusRef.current = false;
          hoverRef.current = false;
          touchRef.current = false;
        } else {
          hoverRef.current = true;
        }
      }

      const paused =
        reducedMotionRef.current ||
        hoverRef.current ||
        touchRef.current ||
        focusRef.current ||
        !visibleRef.current ||
        document.hidden ||
        now < resumeAtRef.current;

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

  const copyCount = shouldLoop ? copies : 1;

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
          onPointerEnter={e => {
            if (e.pointerType === 'touch') return;
            hoverRef.current = true;
            pointerRef.current.x = e.clientX;
            pointerRef.current.y = e.clientY;
            pointerRef.current.type = e.pointerType;
            pointerRef.current.seen = true;
          }}
          onPointerLeave={e => {
            touchRef.current = false;
            if (e.pointerType === 'touch') return;
            // Retoma já. Não usar holdAutoplay aqui — isso deixava o loop
            // parado vários segundos (e, com o mouseleave perdido, para sempre).
            hoverRef.current = false;
            focusRef.current = false;
            resumeAtRef.current = 0;
            // Fora do rect, mesmo que o browser reporte o leave ainda dentro.
            pointerRef.current.x = -1;
            pointerRef.current.y = -1;
            pointerRef.current.type = e.pointerType;
            pointerRef.current.seen = true;
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
          onPointerDown={e => {
            if (e.pointerType === 'touch') touchRef.current = true;
          }}
          onPointerUp={e => {
            touchRef.current = false;
            if (e.pointerType === 'touch') holdAutoplay();
          }}
          onPointerCancel={() => {
            touchRef.current = false;
          }}
          onFocusCapture={() => (focusRef.current = true)}
          onBlurCapture={e => {
            // só retoma quando o foco sai de TODO o carrossel
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              focusRef.current = false;
            }
          }}
          className={`flex gap-4 overflow-x-auto scrollbar-hide pb-2 ${
            shouldLoop ? '' : 'snap-x snap-mandatory'
          }`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          aria-label={title}
        >
          {Array.from({ length: copyCount }).map((_, copy) => (
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
