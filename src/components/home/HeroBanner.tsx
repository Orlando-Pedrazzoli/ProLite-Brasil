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

// Versão de compatibilidade do vídeo, gerada pelo Cloudinary no URL:
// MP4 em H.264 Main 3.1 sem áudio, que qualquer iPhone descodifica.
// Só é pedida se o ficheiro original der erro no aparelho.
const CLOUDINARY_VIDEO_UPLOAD = '/video/upload/';
const COMPAT_TRANSFORM = 'f_mp4,vc_h264:main:3.1,ac_none';

function compatVideoSrc(src: string) {
  if (
    !src.includes('res.cloudinary.com') ||
    !src.includes(CLOUDINARY_VIDEO_UPLOAD) ||
    src.includes(COMPAT_TRANSFORM)
  ) {
    return '';
  }
  return src
    .replace(
      CLOUDINARY_VIDEO_UPLOAD,
      `${CLOUDINARY_VIDEO_UPLOAD}${COMPAT_TRANSFORM}/`,
    )
    .replace(/\.(webm|mov|m4v)(\?.*)?$/i, '.mp4$2');
}

const noopSubscribe = () => () => {};

/** Diagnóstico no próprio telemóvel: abrir a home com ?herodebug=1 */
function useHeroDebug() {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.search.includes('herodebug'),
    () => false,
  );
}

const MEDIA_ERRORS = ['', 'ABORTED', 'NETWORK', 'DECODE', 'SRC_NOT_SUPPORTED'];

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

// Vídeo de fundo do slide ativo. Fica fora do carrossel (que usa
// translateX): no iPhone/Safari um <video> dentro de um ancestral com
// transform não mostra frames e só se vê a imagem da capa.
// O muted tem de estar no elemento antes do play(), senão o iOS recusa
// o autoplay e a capa fica por baixo para sempre.
function HeroVideo({
  src,
  active,
  debug,
  onPlaying,
}: {
  src: string;
  active: boolean;
  debug: boolean;
  onPlaying: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  // Se o ficheiro original falhar, troca uma vez para a versão compatível
  const [useCompat, setUseCompat] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const playError = useRef('');
  const compatSrc = compatVideoSrc(src);
  const currentSrc = useCompat && compatSrc ? compatSrc : src;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');

    if (!active) {
      video.pause();
      return;
    }

    const play = () => {
      video.play().then(
        () => {
          playError.current = '';
        },
        (err: unknown) => {
          playError.current = err instanceof Error ? err.name : String(err);
        },
      );
    };
    play();
    video.addEventListener('loadeddata', play);
    const onVisible = () => {
      if (document.visibilityState === 'visible') play();
    };
    document.addEventListener('visibilitychange', onVisible);
    // Modo de poupança / poucos dados do iPhone só largam o autoplay depois
    // de um toque. O Safari só conta touchend e click como gesto do
    // utilizador; o pointerdown fica para os outros browsers.
    const gestures = ['touchend', 'click', 'pointerdown'] as const;
    gestures.forEach(type =>
      window.addEventListener(type, play, { passive: true }),
    );

    return () => {
      video.removeEventListener('loadeddata', play);
      document.removeEventListener('visibilitychange', onVisible);
      gestures.forEach(type => window.removeEventListener(type, play));
    };
  }, [active, currentSrc]);

  // Painel de diagnóstico (?herodebug=1): estado real do <video> no aparelho
  useEffect(() => {
    const video = ref.current;
    if (!debug || !video) return;
    const report = (event?: Event) => {
      const err = video.error;
      setDebugInfo(
        [
          `evento: ${event?.type ?? 'início'}`,
          `ficheiro: …${currentSrc.slice(-46)}`,
          `compat: ${useCompat ? 'sim' : 'não'}`,
          `readyState: ${video.readyState}/4  networkState: ${video.networkState}`,
          `paused: ${video.paused}  muted: ${video.muted}  t: ${video.currentTime.toFixed(1)}s`,
          `tamanho: ${video.videoWidth}×${video.videoHeight}`,
          `erro: ${err ? `${MEDIA_ERRORS[err.code] ?? err.code} ${err.message}` : 'nenhum'}`,
          `play(): ${playError.current || 'ok'}`,
        ].join('\n'),
      );
    };
    const events = [
      'loadstart',
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'playing',
      'pause',
      'waiting',
      'stalled',
      'suspend',
      'error',
    ];
    events.forEach(type => video.addEventListener(type, report));
    const timer = setInterval(report, 1000);
    return () => {
      events.forEach(type => video.removeEventListener(type, report));
      clearInterval(timer);
    };
  }, [debug, currentSrc, useCompat]);

  return (
    <>
      <video
        ref={ref}
        src={currentSrc}
        muted
        playsInline
        autoPlay
        loop
        preload='auto'
        onPlaying={onPlaying}
        onError={() => {
          if (!useCompat && compatSrc) setUseCompat(true);
        }}
        onEnded={() => {
          const video = ref.current;
          if (!video) return;
          try {
            video.currentTime = 0;
          } catch {
            /* ainda não dá para seek */
          }
          video.play().catch(() => {});
        }}
        aria-hidden='true'
        tabIndex={-1}
        className='pointer-events-none absolute inset-0 z-10 h-full w-full object-cover'
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {debug && (
        <pre className='pointer-events-none absolute left-2 top-2 z-30 max-w-[calc(100%-1rem)] whitespace-pre-wrap rounded bg-black/75 p-2 font-mono text-[10px] leading-snug text-white'>
          {debugInfo || 'a iniciar…'}
        </pre>
      )}
    </>
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
  const debug = useHeroDebug();

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
      <div
        data-hero
        className='w-full aspect-[4/5] md:aspect-[2.5/1] bg-gray-100 animate-pulse'
      />
    );
  }

  if (banners.length === 0) return null;

  const currentVideo = slideVideoSrc(
    banners[current],
    isDesktop,
    reducedMotion,
  );

  return (
    <div data-hero className='relative w-full overflow-hidden'>
      <div
        className='flex transition-transform duration-500 ease-in-out'
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((banner, idx) => {
          const mobileSrc = banner.mobileImage?.trim()
            ? banner.mobileImage
            : banner.image;

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

      {currentVideo && (
        <HeroVideo
          key={currentVideo}
          src={currentVideo}
          active
          debug={debug}
          onPlaying={() => setPlayingId(banners[current]._id)}
        />
      )}

      {debug && !currentVideo && (
        <pre className='pointer-events-none absolute left-2 top-2 z-30 max-w-[calc(100%-1rem)] whitespace-pre-wrap rounded bg-black/75 p-2 font-mono text-[10px] leading-snug text-white'>
          {[
            'sem vídeo neste slide',
            `reduzir movimento: ${reducedMotion ? 'LIGADO (vídeo desativado)' : 'não'}`,
            `ecrã: ${isDesktop ? 'desktop' : 'mobile'}`,
            `video: ${banners[current]?.video ? 'sim' : 'vazio'}  mobileVideo: ${banners[current]?.mobileVideo ? 'sim' : 'vazio'}`,
          ].join('\n')}
        </pre>
      )}

      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className='absolute left-4 top-1/2 z-20 -translate-y-1/2 w-10 h-10 bg-black/30 text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors'
            aria-label='Banner anterior'
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={next}
            className='absolute right-4 top-1/2 z-20 -translate-y-1/2 w-10 h-10 bg-black/30 text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors'
            aria-label='Próximo banner'
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {banners.length > 1 && (
        <div className='absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex gap-2'>
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
