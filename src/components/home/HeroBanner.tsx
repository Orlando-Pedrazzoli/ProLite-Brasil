'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Banner {
  _id: string;
  title: string;
  image: string;
  mobileImage?: string;
  video?: string;
  mobileVideo?: string;
  link?: string;
}

/** Tempo de cada slide de imagem (e fallback se o vídeo não arrancar) */
const SLIDE_MS = 10000;

function slideVideoSrc(
  banner: Banner | undefined,
  isDesktop: boolean,
  reducedMotion: boolean,
) {
  if (!banner || reducedMotion) return '';
  const desktopVideo = banner.video?.trim() || '';
  const mobileVideo = banner.mobileVideo?.trim() || desktopVideo;
  return isDesktop ? desktopVideo || mobileVideo : mobileVideo;
}

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Vídeo de fundo de um slide. Fica por cima da imagem (capa): enquanto
// não há frames para mostrar o elemento é transparente e vê-se a imagem.
// Só o slide ativo carrega e toca; os outros ficam com preload="none".
// O vídeo fica em loop — não avança o carrossel sozinho.
function HeroVideo({
  src,
  active,
  onPlaying,
}: {
  src: string;
  active: boolean;
  onPlaying: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (active) {
      video.muted = true; // exigido para autoplay (iOS/Chrome)
      // currentTime antes do metadata pode lançar e impedir o play().
      if (video.readyState >= 1) {
        try {
          video.currentTime = 0;
        } catch {
          /* ainda não dá para seek */
        }
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active, src]);

  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      autoPlay
      loop
      preload={active ? 'auto' : 'none'}
      onPlaying={onPlaying}
      onEnded={() => {
        // Se o browser ignorar o atributo loop, recomeça em vez de
        // deixar o carrossel saltar para o banner seguinte.
        const video = ref.current;
        if (!video) return;
        video.currentTime = 0;
        video.play().catch(() => {});
      }}
      aria-hidden='true'
      tabIndex={-1}
      className='absolute inset-0 z-10 h-full w-full object-cover'
    />
  );
}

export default function HeroBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  // _id do banner cujo vídeo está efetivamente a tocar
  const [playingId, setPlayingId] = useState<string | null>(null);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch('/api/banners?position=hero&active=true');
        const data = await res.json();
        if (data.success) setBanners(data.banners);
      } catch {
        console.error('Erro ao carregar banners');
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % banners.length);
  }, [banners.length]);

  const prev = () => {
    setCurrent(prev => (prev - 1 + banners.length) % banners.length);
  };

  const videoPlaying =
    playingId !== null && playingId === banners[current]?._id;

  // Avanço automático dos slides só de imagem. Um slide com vídeo fica
  // em loop e não cede o lugar sozinho (as setas continuam a funcionar).
  useEffect(() => {
    if (banners.length <= 1 || videoPlaying) return;
    if (slideVideoSrc(banners[current], isDesktop, reducedMotion)) return;
    const timeout = setTimeout(next, SLIDE_MS);
    return () => clearTimeout(timeout);
  }, [banners, current, videoPlaying, next, isDesktop, reducedMotion]);

  if (loading) {
    return (
      <div className='w-full aspect-[4/5] md:aspect-[2.5/1] bg-gray-100 animate-pulse' />
    );
  }

  if (banners.length === 0) return null;

  return (
    <div className='relative w-full overflow-hidden'>
      <div
        className='flex transition-transform duration-500 ease-in-out'
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((banner, idx) => {
          const mobileSrc = banner.mobileImage?.trim()
            ? banner.mobileImage
            : banner.image;

          // Um único <video> por slide, com a versão certa para o ecrã
          // (assim o telemóvel nunca descarrega o ficheiro de desktop).
          const videoSrc = slideVideoSrc(banner, isDesktop, reducedMotion);

          const Slide = (
            <div className='relative w-full aspect-[4/5] md:aspect-[2.5/1]'>
              {/* Mobile image (hidden on md+) */}
              <div className='md:hidden absolute inset-0'>
                <Image
                  src={mobileSrc}
                  alt={banner.title}
                  fill
                  priority={idx === 0}
                  sizes='100vw'
                  className='object-cover'
                />
              </div>
              {/* Desktop image (hidden on mobile) */}
              <div className='hidden md:block absolute inset-0'>
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill
                  priority={idx === 0}
                  sizes='100vw'
                  className='object-cover'
                />
              </div>
              {videoSrc && (
                <HeroVideo
                  src={videoSrc}
                  active={idx === current}
                  onPlaying={() => setPlayingId(banner._id)}
                />
              )}
            </div>
          );

          return (
            <div key={banner._id} className='w-full flex-shrink-0 relative'>
              {banner.link ? (
                <Link href={banner.link} className='block'>
                  {Slide}
                </Link>
              ) : (
                Slide
              )}
            </div>
          );
        })}
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className='absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors'
            aria-label='Banner anterior'
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={next}
            className='absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors'
            aria-label='Próximo banner'
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {banners.length > 1 && (
        <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2'>
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-3 h-3 rounded-full transition-colors ${
                i === current ? 'bg-white' : 'bg-white/50'
              }`}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
