// src/components/home/FeaturedProducts.tsx
// v3: CARROSSEL CONTÍNUO EM LOOP INFINITO — motor por `transform`.
//
// Porquê v3: a v2 avançava o carrossel escrevendo em `scrollLeft` a cada
// frame. No iOS (Safari/Chrome de iPhone) o scroll de um contentor é gerido
// fora da thread da página e essas escritas de 1px por frame são ignoradas
// ou revertidas — o autoplay simplesmente não andava no telemóvel. Agora a
// posição é UMA variável (xRef) aplicada com translate3d, igual em todos
// os browsers; não há scroll nativo envolvido.
//
// Como funciona:
//   • a lista é renderizada uma vez. Cópias extras (loop infinito) só existem
//     quando a fila é mais larga que o ecrã — senão os produtos aparecem
//     uma vez, parados, sem duplicar para encher o carrossel;
//   • autoplay por requestAnimationFrame, velocidade em px/s (independente
//     do refresh rate; no modo de pouca bateria do iOS o rAF vai a 30fps e
//     a velocidade mantém-se);
//   • ARRASTAR com o dedo ou o rato move a fila (com inércia ao largar);
//     `touch-action: pan-y` deixa o scroll vertical da página intacto.
//     Trackpad/roda horizontal também movem a fila;
//   • PAUSA enquanto o cursor está por cima, durante um toque/arrasto, com
//     foco por teclado, fora do ecrã, com a aba em segundo plano, e uns
//     segundos depois de uma interação;
//   • respeita prefers-reduced-motion ("Reduzir movimento" do telemóvel):
//     sem autoplay, mas continua a dar para arrastar;
//   • se a busca principal devolver menos de `minItems` produtos, COMPLETA
//     a fila com os publicados mais recentes (fallbackUrl).
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

const SET_GAP = 16; // pr-4 no fim de cada conjunto (= gap-4 entre cartões)
const DRAG_THRESHOLD = 6; // px de movimento horizontal até virar arrasto

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

  const viewportRef = useRef<HTMLDivElement>(null); // janela visível (overflow hidden)
  const trackRef = useRef<HTMLDivElement>(null); // fila que desliza por transform
  const setRef = useRef<HTMLDivElement>(null); // 1.º conjunto (mede o período do loop)

  // Estado do motor em refs (não re-renderiza a cada frame)
  const xRef = useRef(0); // deslocamento atual, em px, dentro de [0, período)
  const periodRef = useRef(0); // largura de um ciclo (conjunto + gap)
  const velocityRef = useRef(0); // inércia após arrasto (px/ms)
  const glideRef = useRef<{
    from: number;
    last: number;
    to: number;
    start: number;
    duration: number;
  } | null>(null);
  const dragRef = useRef({
    pointerId: -1,
    active: false,
    startX: 0,
    startY: 0,
    startOffset: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
  });
  const draggedRef = useRef(false); // houve arrasto → engole o click seguinte

  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const visibleRef = useRef(true);
  const resumeAtRef = useRef(0);
  const reducedMotionRef = useRef(false);
  // Última posição do cursor. O mouseleave perde-se quando um re-render
  // mexe no DOM debaixo do ponteiro; no tick comparamos esta posição com
  // o retângulo do carrossel.
  const pointerRef = useRef({ x: 0, y: 0, type: '', seen: false });

  // Diagnóstico no próprio telemóvel: abrir a home com ?carrossel-debug
  // mostra, por baixo do carrossel, porque é que o autoplay está parado.
  const [debug, setDebug] = useState<string | null>(null);
  const debugOnRef = useRef(false);
  useEffect(() => {
    debugOnRef.current = window.location.search.includes('carrossel-debug');
    if (debugOnRef.current) setDebug('a medir…');
  }, []);

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

  // ═══ MOTOR DO CARROSSEL ═══════════════════════════════════════
  // Loop só quando a fila real não cabe no ecrã. Até medir, 1 cópia.
  const [copies, setCopies] = useState(1);
  const [overflows, setOverflows] = useState(false);
  const shouldLoop = overflows && products.length > 0;

  /** Pausa o autoplay por `resumeAfter` segundos (setas, toque, arrasto). */
  const holdAutoplay = useCallback(() => {
    resumeAtRef.current = performance.now() + resumeAfter * 1000;
  }, [resumeAfter]);

  /** Aplica a posição: x sempre em [0, período) — o loop é só um módulo. */
  const applyX = useCallback((next: number) => {
    const period = periodRef.current;
    const track = trackRef.current;
    if (!track || !period) return;
    const wrapped = ((next % period) + period) % period;
    xRef.current = wrapped;
    track.style.transform = `translate3d(${-wrapped}px,0,0)`;
  }, []);

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

  // ── Mede a fila real. Só duplica e anima se passar da largura visível. ──
  useEffect(() => {
    const viewport = viewportRef.current;
    const set = setRef.current;
    if (!viewport || !set || loading || products.length === 0) return;
    const measure = () => {
      // período = 1 conjunto + o seu gap final (pr-4 = SET_GAP)
      const period = set.offsetWidth;
      if (!period) return;
      const over = period - SET_GAP > viewport.clientWidth + 1;
      setOverflows(over);
      if (!over) {
        periodRef.current = 0;
        xRef.current = 0;
        if (trackRef.current) trackRef.current.style.transform = '';
        setCopies(1);
        return;
      }
      periodRef.current = period;
      // x ∈ [0, período) → é preciso cobrir período + largura visível
      const needed = Math.ceil(viewport.clientWidth / period) + 1;
      setCopies(Math.max(2, Math.min(needed, 12)));
      applyX(xRef.current);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    ro.observe(set);
    return () => ro.disconnect();
  }, [loading, products.length, applyX]);

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
    const el = viewportRef.current;
    if (!el || !shouldLoop) return;
    const io = new IntersectionObserver(
      ([entry]) => (visibleRef.current = entry.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shouldLoop, loading]);

  // ── Loop de animação: autoplay + inércia do arrasto + setas ──
  useEffect(() => {
    if (!shouldLoop || loading) return;
    const el = viewportRef.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let debugAt = 0;

    const tick = (now: number) => {
      frames += 1;
      if (debugOnRef.current && now > debugAt) {
        debugAt = now + 500;
        setDebug(
          `movimento-reduzido:${reducedMotionRef.current ? 'SIM' : 'nao'} visivel:${visibleRef.current ? 'sim' : 'NAO'} hover:${hoverRef.current ? 'SIM' : 'nao'} foco:${focusRef.current ? 'SIM' : 'nao'} espera:${now < resumeAtRef.current ? 'SIM' : 'nao'} x:${Math.round(xRef.current)} periodo:${Math.round(periodRef.current)} frames:${frames}`,
        );
      }
      const elapsed = Math.min(now - last, 100); // ms (limita saltos após aba inativa)
      const dt = elapsed / 1000;
      last = now;

      const point = pointerRef.current;
      if (point.seen && point.type === 'mouse' && !dragRef.current.active) {
        const rect = el.getBoundingClientRect();
        const over =
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom;
        if (!over) {
          // Saiu: não deixar hover ou foco de rato segurarem o loop.
          if (hoverRef.current) focusRef.current = false;
          hoverRef.current = false;
        } else {
          hoverRef.current = true;
        }
      }

      const glide = glideRef.current;
      if (dragRef.current.active) {
        // o dedo/rato manda — nada a fazer aqui
      } else if (glide) {
        // Setas: desliza ~1 cartão com easing
        const t = Math.min(1, (now - glide.start) / glide.duration);
        const eased = 1 - Math.pow(1 - t, 3);
        glide.last = glide.from + (glide.to - glide.from) * eased;
        applyX(glide.last);
        if (t >= 1) glideRef.current = null;
      } else if (Math.abs(velocityRef.current) > 0.02) {
        // Inércia depois de largar (px/ms, decai ~95% por frame de 60fps)
        applyX(xRef.current + velocityRef.current * elapsed);
        velocityRef.current *= Math.pow(0.95, elapsed / 16.67);
      } else {
        velocityRef.current = 0;
        const paused =
          reducedMotionRef.current ||
          hoverRef.current ||
          focusRef.current ||
          !visibleRef.current ||
          document.hidden ||
          now < resumeAtRef.current;
        if (!paused) applyX(xRef.current + speed * dt);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shouldLoop, loading, speed, applyX]);

  // ── Trackpad / roda horizontal (listener não-passivo para preventDefault) ──
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !shouldLoop) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // scroll vertical: página
      e.preventDefault();
      glideRef.current = null;
      velocityRef.current = 0;
      applyX(xRef.current + e.deltaX);
      holdAutoplay();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [shouldLoop, loading, applyX, holdAutoplay]);

  // ── Setas: deslocam ~1 cartão e seguram o autoplay uns segundos ──
  const scroll = (direction: 'left' | 'right') => {
    const el = viewportRef.current;
    if (!el) return;
    holdAutoplay();
    velocityRef.current = 0;
    const card = el.querySelector<HTMLElement>('[data-card]');
    const amount = card ? card.offsetWidth + 16 : 300; // 16 = gap-4
    // clique repetido: soma ao que ainda faltava percorrer
    const pending = glideRef.current
      ? glideRef.current.to - glideRef.current.last
      : 0;
    glideRef.current = {
      from: xRef.current,
      last: xRef.current,
      to: xRef.current + pending + (direction === 'left' ? -amount : amount),
      start: performance.now(),
      duration: 450,
    };
  };

  // ── Arrasto (dedo ou rato) ──
  const endDrag = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = dragRef.current;
    if (drag.pointerId !== e.pointerId) return;
    drag.pointerId = -1;
    if (drag.active) {
      drag.active = false;
      // velocidade do dedo → inércia (px/ms; x cresce para a esquerda)
      const dt = performance.now() - drag.lastT;
      velocityRef.current =
        cancelled || dt > 80 ? 0 : Math.max(-3, Math.min(3, drag.velocity));
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* captura já libertada */
      }
    }
    holdAutoplay();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldLoop) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    glideRef.current = null;
    velocityRef.current = 0;
    draggedRef.current = false;
    dragRef.current = {
      pointerId: e.pointerId,
      active: false,
      startX: e.clientX,
      startY: e.clientY,
      startOffset: xRef.current,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
    // segura o autoplay já no toque (mesmo antes de virar arrasto)
    holdAutoplay();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.active) {
      // só vira arrasto com movimento claramente horizontal
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      drag.active = true;
      draggedRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* sem captura: continua a funcionar dentro do carrossel */
      }
    }
    const now = performance.now();
    const step = e.clientX - drag.lastX;
    const dt = now - drag.lastT;
    if (dt > 0) {
      // média móvel para a inércia não depender de um único evento
      drag.velocity = drag.velocity * 0.6 + (-step / dt) * 0.4;
    }
    drag.lastX = e.clientX;
    drag.lastT = now;
    applyX(drag.startOffset - dx);
    holdAutoplay();
  };

  // Teclado: o cartão focado pode estar fora da área visível (transform
  // não faz scroll-into-view sozinho) — traz para dentro.
  const onFocusCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    focusRef.current = true;
    if (!shouldLoop) return;
    const viewport = viewportRef.current;
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
    if (!viewport || !card) return;
    const view = viewport.getBoundingClientRect();
    const rect = card.getBoundingClientRect();
    glideRef.current = null;
    velocityRef.current = 0;
    if (rect.left < view.left) applyX(xRef.current - (view.left - rect.left));
    else if (rect.right > view.right)
      applyX(xRef.current + (rect.right - view.right));
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
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={e => endDrag(e, false)}
          onPointerCancel={e => endDrag(e, true)}
          onPointerEnter={e => {
            if (e.pointerType !== 'mouse') return;
            hoverRef.current = true;
            pointerRef.current.x = e.clientX;
            pointerRef.current.y = e.clientY;
            pointerRef.current.type = e.pointerType;
            pointerRef.current.seen = true;
          }}
          onPointerLeave={e => {
            if (e.pointerType !== 'mouse') return;
            if (dragRef.current.active) return; // arrasto capturado continua
            // Retoma já ao sair o cursor.
            hoverRef.current = false;
            focusRef.current = false;
            resumeAtRef.current = 0;
            pointerRef.current.x = -1;
            pointerRef.current.y = -1;
            pointerRef.current.type = e.pointerType;
            pointerRef.current.seen = true;
          }}
          // Depois de arrastar, o "click" que o browser dispara ao largar
          // não pode abrir o produto.
          onClickCapture={e => {
            if (!draggedRef.current) return;
            draggedRef.current = false;
            e.preventDefault();
            e.stopPropagation();
          }}
          // Sem o arrasto nativo de links/imagens (roubava o gesto ao rato)
          onDragStart={e => e.preventDefault()}
          onFocusCapture={onFocusCapture}
          onBlurCapture={e => {
            // só retoma quando o foco sai de TODO o carrossel
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              focusRef.current = false;
            }
          }}
          className='overflow-hidden pb-2'
          // pan-y: o browser trata do scroll vertical da página; o gesto
          // horizontal fica para o carrossel.
          style={{ touchAction: shouldLoop ? 'pan-y' : undefined }}
          aria-label={title}
        >
          <div
            ref={trackRef}
            className='flex w-max'
            style={{ willChange: shouldLoop ? 'transform' : undefined }}
          >
            {Array.from({ length: copyCount }).map((_, copy) => (
              <div
                key={copy}
                ref={copy === 0 ? setRef : undefined}
                // pr-4 = gap entre o último cartão e a cópia seguinte; faz
                // parte da largura do conjunto → período exato do loop
                className='flex gap-4 pr-4 flex-shrink-0'
              >
                {products.map(product => (
                  <div
                    key={`${copy}-${product._id}`}
                    data-card
                    // 38vw no telemóvel: cabem 2 cartões e sobra ~30px do 3.º à
                    // vista — sinal de que há mais produtos para o lado
                    className='flex-shrink-0 w-[38vw] sm:w-[31vw] md:w-[23.5vw] max-w-[300px]'
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {debug !== null && (
          <p className='mt-2 px-2 font-mono text-[11px] leading-snug text-red-600 break-words'>
            {shouldLoop ? debug : 'sem loop: os produtos cabem no ecrã'}
          </p>
        )}
      </div>
    </section>
  );
}
