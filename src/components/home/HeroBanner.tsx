// src/components/home/HeroBanner.tsx
'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

interface Banner {
  _id: string;
  title: string;
  image: string;
  mobileImage?: string;
  video?: string;
  mobileVideo?: string;
  link?: string;
}

/** Tempo de cada slide de imagem */
const SLIDE_MS = 10000;
/** Sem dados ao fim deste tempo, tenta a versão compatível do vídeo */
const STALL_MS = 10000;

// Vídeos do slide por ordem de preferência: primeiro o do ecrã atual e,
// se esse falhar no aparelho, o do outro ecrã (antes vídeo recortado do
// que capa parada).
function slideVideos(banner: Banner | undefined, isDesktop: boolean) {
  if (!banner) return [];
  const desktop = banner.video?.trim() || '';
  const mobile = banner.mobileVideo?.trim() || '';
  const ordered = isDesktop ? [desktop, mobile] : [mobile, desktop];
  return ordered.filter((src, i) => src && ordered.indexOf(src) === i);
}

// Versão de compatibilidade do vídeo, gerada pelo Cloudinary no URL:
// MP4 em H.264 Main sem áudio, que qualquer iPhone descodifica.
// Nível 4.0 e não 3.1: o 3.1 só vai até 1280×720 e o vídeo mobile
// recomendado (1080×1350) fica acima disso.
const CLOUDINARY_VIDEO_UPLOAD = '/video/upload/';
const COMPAT_TRANSFORM = 'f_mp4,vc_h264:main:4.0,ac_none';

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

const MEDIA_STYLE = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
} as const;

// Vídeo de fundo do slide ativo. Fica fora do carrossel (que usa
// translateX) e por cima da imagem de capa.
//
// O que pode impedir o vídeo de arrancar num iPhone, e o que se faz:
// 1. Ficheiro que o aparelho não descodifica → passa para a versão
//    H.264 do Cloudinary e, se for preciso, para o vídeo do outro ecrã.
// 2. Autoplay recusado pelo iOS (Modo de Pouca Energia / Poucos Dados):
//    o play() é rejeitado com NotAllowedError. O Safari toca um MP4
//    dentro de um <img> como imagem animada, sem passar pela política de
//    autoplay, por isso o vídeo passa a ser mostrado assim. Nos outros
//    browsers o <img> dá erro e fica a capa com o botão de play.
// 3. Em qualquer caso, o primeiro toque no ecrã arranca o <video>.
function HeroVideo({
  videos,
  debug,
  reducedMotion,
  onFailed,
}: {
  videos: string[];
  debug: boolean;
  reducedMotion: boolean;
  onFailed: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  // Fontes do <video>: cada vídeo no original e depois na versão compatível
  const sources = useMemo(
    () =>
      videos.flatMap(src => {
        const compat = compatVideoSrc(src);
        return compat ? [src, compat] : [src];
      }),
    [videos],
  );
  // Fontes do <img>: a versão compatível primeiro (H.264 sem áudio)
  const imageSources = useMemo(
    () =>
      videos.flatMap(src => {
        const compat = compatVideoSrc(src);
        return compat ? [compat, src] : [src];
      }),
    [videos],
  );

  const [srcIndex, setSrcIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  // O aparelho recusou o autoplay (só arranca com um toque)
  const [blocked, setBlocked] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [imgReady, setImgReady] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const userPausedRef = useRef(false);
  const playError = useRef('');
  const [debugInfo, setDebugInfo] = useState('');

  const src = sources[srcIndex] ?? '';
  const imgSrc = imageSources[imgIndex] ?? '';
  const showImage = blocked && !playing && !userPaused && imgSrc !== '';
  const inMotion = !userPaused && (playing || (showImage && imgReady));

  const tryPlay = useCallback(() => {
    const video = ref.current;
    if (!video || userPausedRef.current) return;
    video.play().then(
      () => {
        playError.current = '';
      },
      (err: unknown) => {
        const name = (err as { name?: string } | null)?.name || String(err);
        playError.current = name;
        if (name === 'NotAllowedError') setBlocked(true);
      },
    );
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // O muted tem de estar no elemento antes do play(), senão o iOS
    // recusa o autoplay.
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');

    tryPlay();
    video.addEventListener('loadeddata', tryPlay);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tryPlay();
    };
    document.addEventListener('visibilitychange', onVisible);
    // O Safari só conta touchend e click como gesto do utilizador; o
    // pointerdown fica para os outros browsers.
    const gestures = ['touchend', 'click', 'pointerdown'] as const;
    gestures.forEach(type =>
      window.addEventListener(type, tryPlay, { passive: true }),
    );

    return () => {
      video.removeEventListener('loadeddata', tryPlay);
      document.removeEventListener('visibilitychange', onVisible);
      gestures.forEach(type => window.removeEventListener(type, tryPlay));
    };
  }, [src, tryPlay]);

  // Ficheiro que não dá erro mas também não carrega: tenta a versão
  // compatível do mesmo vídeo (nunca salta para o do outro ecrã por isto).
  useEffect(() => {
    const next = sources[srcIndex + 1];
    if (!next || next !== compatVideoSrc(src)) return;
    const timer = setTimeout(() => {
      const video = ref.current;
      if (
        video &&
        video.readyState < 2 &&
        playError.current !== 'NotAllowedError'
      ) {
        setSrcIndex(i => (i === srcIndex ? i + 1 : i));
      }
    }, STALL_MS);
    return () => clearTimeout(timer);
  }, [sources, src, srcIndex]);

  const togglePlayback = () => {
    const video = ref.current;
    if (!video) return;
    if (inMotion) {
      userPausedRef.current = true;
      setUserPaused(true);
      video.pause();
    } else {
      userPausedRef.current = false;
      setUserPaused(false);
      tryPlay();
    }
  };

  // Painel de diagnóstico (?herodebug=1): estado real no aparelho
  useEffect(() => {
    const video = ref.current;
    if (!debug || !video) return;
    const report = (event?: Event) => {
      const err = video.error;
      setDebugInfo(
        [
          `evento: ${event?.type ?? 'início'}`,
          `fonte ${srcIndex + 1}/${sources.length}: …${src.slice(-44)}`,
          `readyState: ${video.readyState}/4  networkState: ${video.networkState}`,
          `paused: ${video.paused}  muted: ${video.muted}  t: ${video.currentTime.toFixed(1)}s`,
          `tamanho: ${video.videoWidth}×${video.videoHeight}`,
          `erro: ${err ? `${MEDIA_ERRORS[err.code] ?? err.code} ${err.message}` : 'nenhum'}`,
          `play(): ${playError.current || 'ok'}`,
          `autoplay recusado: ${blocked ? 'SIM' : 'não'}`,
          `modo imagem: ${
            !blocked
              ? 'não'
              : imgSrc === ''
                ? 'falhou (capa + botão play)'
                : imgReady
                  ? `a tocar (${imgIndex + 1}/${imageSources.length})`
                  : `a carregar (${imgIndex + 1}/${imageSources.length})`
          }`,
          `reduzir movimento: ${reducedMotion ? 'ligado (não impede o vídeo)' : 'não'}`,
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
  }, [
    debug,
    src,
    srcIndex,
    sources.length,
    blocked,
    imgSrc,
    imgIndex,
    imgReady,
    imageSources.length,
    reducedMotion,
  ]);

  return (
    <>
      <video
        ref={ref}
        src={src}
        muted
        playsInline
        autoPlay
        loop
        preload='auto'
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEmptied={() => setPlaying(false)}
        onError={() => {
          if (srcIndex < sources.length - 1) setSrcIndex(srcIndex + 1);
          else onFailed();
        }}
        onEnded={() => {
          const video = ref.current;
          if (!video) return;
          try {
            video.currentTime = 0;
          } catch {
            /* ainda não dá para seek */
          }
          tryPlay();
        }}
        aria-hidden='true'
        tabIndex={-1}
        className='pointer-events-none absolute inset-0 z-10 h-full w-full object-cover'
        style={MEDIA_STYLE}
      />

      {/* Sem dados o <img> é transparente (alt vazio), por isso fica logo
          visível: não depende do onLoad, que pode não disparar para MP4. */}
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={imgSrc}
          src={imgSrc}
          alt=''
          aria-hidden='true'
          onLoad={() => setImgReady(true)}
          onError={() => {
            setImgReady(false);
            setImgIndex(imgIndex + 1);
          }}
          className='pointer-events-none absolute inset-0 z-10 h-full w-full object-cover'
          style={MEDIA_STYLE}
        />
      )}

      <button
        type='button'
        onClick={togglePlayback}
        className='absolute z-20 w-10 h-10 bg-black/30 text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors'
        style={{ right: 12, bottom: 12 }}
        aria-label={inMotion ? 'Pausar vídeo' : 'Reproduzir vídeo'}
      >
        {inMotion ? <Pause size={18} /> : <Play size={18} />}
      </button>

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
  // _id do banner cujo vídeo falhou em todas as fontes (volta a ser um
  // slide de imagem normal)
  const [failedId, setFailedId] = useState<string | null>(null);

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

  const currentBanner = banners[current];
  const currentVideos = useMemo(
    () => slideVideos(currentBanner, isDesktop),
    [currentBanner, isDesktop],
  );
  const hasVideo = currentVideos.length > 0 && failedId !== currentBanner?._id;

  // Avanço automático dos slides só de imagem. Um slide com vídeo fica
  // em loop e não cede o lugar sozinho (as setas continuam a funcionar).
  useEffect(() => {
    if (banners.length <= 1 || hasVideo) return;
    const timeout = setTimeout(next, SLIDE_MS);
    return () => clearTimeout(timeout);
  }, [banners.length, current, hasVideo, next]);

  if (loading) {
    return (
      <div
        data-hero
        className='w-full aspect-[4/5] md:aspect-[2.5/1] bg-gray-100 animate-pulse'
      />
    );
  }

  if (banners.length === 0) return null;

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

      {hasVideo && currentBanner && (
        <HeroVideo
          key={`${currentBanner._id}|${currentVideos.join('|')}`}
          videos={currentVideos}
          debug={debug}
          reducedMotion={reducedMotion}
          onFailed={() => setFailedId(currentBanner._id)}
        />
      )}

      {debug && !hasVideo && (
        <pre className='pointer-events-none absolute left-2 top-2 z-30 max-w-[calc(100%-1rem)] whitespace-pre-wrap rounded bg-black/75 p-2 font-mono text-[10px] leading-snug text-white'>
          {[
            currentVideos.length > 0
              ? 'vídeo falhou em todas as fontes'
              : 'sem vídeo neste slide',
            `ecrã: ${isDesktop ? 'desktop' : 'mobile'}`,
            `video: ${currentBanner?.video ? 'sim' : 'vazio'}  mobileVideo: ${currentBanner?.mobileVideo ? 'sim' : 'vazio'}`,
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
