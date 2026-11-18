// 📄 src/components/shared/SiteAssistant.tsx
// Assistente virtual do site (botão flutuante à esquerda + painel de chat).
//
// Animação do botão — decisões:
// - O avatar "sobe" para dentro do círculo ao carregar a página e fica em
//   repouso. Só se mexe (sobe e desce devagar) enquanto o balão "Posso
//   ajudar?" está visível, para chamar a atenção sem cansar.
// - O balão aparece sozinho uma única vez por sessão, alguns segundos
//   depois de o visitante decidir o banner de cookies (que tapa os botões
//   flutuantes), e some sozinho. Depois disso só volta com o rato por cima.
// - Só se animam transform e opacity (não mexe no layout nem pesa no
//   scroll), e quem tem "reduzir movimento" ligado vê tudo sem animação.
//
// Telemóvel (< 768px) — um único botão de atendimento:
// - Dois botões flutuantes tapavam o conteúdo nos dois cantos. No mobile
//   fica um só, à direita (zona do polegar), que abre um mini-menu com
//   "Assistente virtual" e "WhatsApp". O WhatsAppButton esconde-se no mobile.
// - O botão não aparece por cima do hero (`[data-hero]`) e some enquanto
//   o visitante desce a página; volta ao subir ou ao parar.
// - No desktop nada muda: assistente à esquerda, WhatsApp à direita.
'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import AssistantAvatar from '@/components/shared/AssistantAvatar';
import { getCookieConsent } from '@/components/shared/CookieConsent';
import { getWhatsAppUrl } from '@/lib/config/company';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Quanto tempo depois de a página estar livre o balão aparece */
const TEASER_DELAY_MS = 3500;
/** No mobile o botão só aparece com a página parada: espera menor */
const TEASER_DELAY_MOBILE_MS = 1500;
/** Quanto tempo o balão fica antes de sumir sozinho */
const TEASER_VISIBLE_MS = 9000;
/** Marca na sessão: o balão já apareceu, não repetir a cada página */
const TEASER_KEY = 'prolite-assistant-teaser';

function subscribeConsent(onChange: () => void) {
  window.addEventListener('cookie-consent-updated', onChange);
  return () =>
    window.removeEventListener('cookie-consent-updated', onChange);
}

/** Páginas de compra: o botão continua lá, mas sem balão a distrair */
const NO_TEASER_PREFIXES = [
  '/carrinho',
  '/checkout',
  '/pagamento',
  '/pedido-confirmado',
];

const WHATSAPP_URL = getWhatsAppUrl(
  'Olá! Gostaria de saber mais sobre os produtos da Pro-Lite.',
);

/** Faixa do fundo do ecrã que o botão ocupa (botão + margens) */
const LAUNCHER_ZONE_PX = 88;
/** Parado este tempo, o botão volta a aparecer */
const SCROLL_IDLE_MS = 450;

// Botão único do mobile: livre do hero e sem scroll para baixo em curso.
// Um único listener passivo, medido no máximo uma vez por frame.
function useMobileLauncherVisible(pathname: string) {
  const [clearOfHero, setClearOfHero] = useState(false);
  const [scrollingDown, setScrollingDown] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;

    const measure = () => {
      frame = 0;
      const hero = document.querySelector('[data-hero]');
      setClearOfHero(
        !hero ||
          hero.getBoundingClientRect().bottom <
            window.innerHeight - LAUNCHER_ZONE_PX,
      );
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 6) {
        setScrollingDown(y > lastY);
        lastY = y;
      }
      clearTimeout(idle);
      idle = setTimeout(() => setScrollingDown(false), SCROLL_IDLE_MS);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    schedule();
    // A página nova pode ainda não estar no DOM quando a rota muda
    const late = setTimeout(schedule, 400);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(idle);
      clearTimeout(late);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [pathname]);

  return clearOfHero && !scrollingDown;
}

// Cara do botão: avatar que entra a subir, sobe e desce enquanto o balão
// está visível e desce para fora quando passa a ser o botão de fechar (X).
function LauncherFace({
  showClose,
  bobbing,
  reduceMotion,
}: {
  showClose: boolean;
  bobbing: boolean;
  reduceMotion: boolean;
}) {
  const bob = bobbing && !showClose && !reduceMotion;
  return (
    <span
      className={`absolute inset-0 overflow-hidden rounded-full ring-2 ring-white transition-colors duration-200 ${
        showClose ? 'bg-chumbo' : 'bg-brand-100'
      }`}
    >
      <motion.span
        className='absolute inset-0'
        initial={reduceMotion ? false : { y: '110%' }}
        animate={
          showClose
            ? { y: '110%' }
            : bob
              ? { y: ['7%', '-5%', '7%'] }
              : { y: reduceMotion ? '0%' : '7%' }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : bob
              ? { duration: 1.8, ease: 'easeInOut', repeat: Infinity }
              : { type: 'spring', stiffness: 320, damping: 24 }
        }
      >
        <AssistantAvatar className='h-full w-full scale-[1.15]' />
      </motion.span>
      <motion.span
        className='absolute inset-0 flex items-center justify-center text-white'
        initial={false}
        animate={
          showClose
            ? { opacity: 1, scale: 1, rotate: 0 }
            : { opacity: 0, scale: 0.6, rotate: -45 }
        }
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
      >
        <X size={24} />
      </motion.span>
    </span>
  );
}

function markTeaserSeen() {
  try {
    sessionStorage.setItem(TEASER_KEY, '1');
  } catch {
    /* modo privado sem storage: o balão só volta a aparecer noutra página */
  }
}

const WELCOME =
  'Olá, sou a assistente virtual da Pro-Lite. Pergunte sobre produtos, frete, pagamento ou trocas. O estado de uma encomenda só aparece se você estiver logado.';

function MessageText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    part.startsWith('http') ? (
      <a
        key={i}
        href={part}
        target='_blank'
        rel='noopener noreferrer'
        className='underline break-all'
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function SiteAssistant() {
  const pathname = usePathname() || '/';
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME },
  ]);
  // Balão "Posso ajudar?": automático (teaser) ou com o rato por cima
  const [teaser, setTeaser] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Mini-menu do botão único (só mobile)
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = !!useReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const mobileClear = useMobileLauncherVisible(pathname);
  const consentDecided = useSyncExternalStore(
    subscribeConsent,
    () => getCookieConsent() !== null,
    () => false,
  );
  const endRef = useRef<HTMLDivElement>(null);
  const hidden =
    pathname.startsWith('/admin') || pathname.startsWith('/pos');

  const mobileVisible = open || menuOpen || mobileClear;
  const noTeaser = NO_TEASER_PREFIXES.some(p => pathname.startsWith(p));
  // No mobile o balão só faz sentido com o botão à vista
  const canTease =
    !hidden &&
    !open &&
    !menuOpen &&
    !noTeaser &&
    consentDecided &&
    (isDesktop || mobileVisible);

  // Mostra o balão uma vez por sessão, com a página já livre do banner
  useEffect(() => {
    if (!canTease) return;
    try {
      if (sessionStorage.getItem(TEASER_KEY) === '1') return;
    } catch {
      /* sem storage: segue e mostra */
    }
    const timer = setTimeout(() => {
      setTeaser(true);
      markTeaserSeen();
    }, isDesktop ? TEASER_DELAY_MS : TEASER_DELAY_MOBILE_MS);
    return () => clearTimeout(timer);
  }, [canTease, isDesktop]);

  // …e esconde-o sozinho ao fim de uns segundos
  useEffect(() => {
    if (!teaser) return;
    const timer = setTimeout(() => setTeaser(false), TEASER_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [teaser]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open, pending]);

  if (hidden) return null;

  const bubbleVisible = !open && (teaser || hovered);

  const openChat = () => {
    setTeaser(false);
    setHovered(false);
    setMenuOpen(false);
    markTeaserSeen();
    setOpen(true);
  };

  // Botão único do mobile: fecha o chat se estiver aberto, senão abre/fecha
  // o mini-menu com as duas formas de atendimento.
  const toggleMobile = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setTeaser(false);
    markTeaserSeen();
    setMenuOpen(v => !v);
  };
  const mobileBubble = teaser && !open && !menuOpen;

  const toggleChat = () => {
    if (open) setOpen(false);
    else openChat();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setPending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.filter(m => m.content !== WELCOME),
        }),
      });
      const type = res.headers.get('content-type') || '';
      if (type.includes('text/plain') && res.body) {
        setMessages(curr => [...curr, { role: 'assistant', content: '' }]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const text = acc;
          setMessages(curr => {
            const copy = [...curr];
            const lastMsg = copy[copy.length - 1];
            if (lastMsg?.role === 'assistant') {
              copy[copy.length - 1] = { role: 'assistant', content: text };
            }
            return copy;
          });
        }
        if (!acc.trim()) {
          setMessages(curr => {
            const copy = [...curr];
            copy[copy.length - 1] = {
              role: 'assistant',
              content: 'Não consegui responder agora. Use o botão verde do WhatsApp.',
            };
            return copy;
          });
        }
      } else {
        const data = (await res.json()) as { reply?: string; error?: string };
        setMessages(curr => [
          ...curr,
          {
            role: 'assistant',
            content:
              data.reply ||
              data.error ||
              'Não consegui responder agora. Use o botão verde do WhatsApp.',
          },
        ]);
      }
    } catch {
      setMessages(curr => [
        ...curr,
        {
          role: 'assistant',
          content: 'Não consegui responder agora. Use o botão verde do WhatsApp.',
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {open && (
        <section
          className='fixed bottom-20 left-4 z-50 flex h-[min(32rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-2rem))] md:bottom-24 md:h-[min(32rem,calc(100dvh-8rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl'
          aria-label='Assistente da Pro-Lite'
        >
          <header className='flex items-center justify-between bg-chumbo px-4 py-3 text-white'>
            <div className='flex min-w-0 items-center gap-3'>
              <span className='h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-100'>
                <AssistantAvatar className='h-full w-full scale-[1.15]' />
              </span>
              <div className='min-w-0'>
                <p className='text-sm font-semibold'>Assistente Pro-Lite</p>
                <p className='text-[11px] text-gray-300'>
                  Informações do site. WhatsApp continua no botão verde.
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={() => setOpen(false)}
              className='shrink-0 rounded-full p-1 hover:bg-white/10'
              aria-label='Fechar chat'
            >
              <X size={16} />
            </button>
          </header>

          <div className='flex-1 space-y-3 overflow-y-auto px-3 py-3'>
            {status === 'authenticated' ? (
              <p className='text-[11px] text-gray-500'>
                Logado como {session?.user?.name || session?.user?.email}. As
                encomendas desta conta podem ser consultadas.
              </p>
            ) : (
              <p className='text-[11px] text-gray-500'>
                Para ver uma encomenda,{' '}
                <Link href='/login' className='font-semibold text-brand hover:underline'>
                  entre na sua conta
                </Link>
                .
              </p>
            )}
            {messages.map((m, i) => (
              <p
                key={i}
                className={`max-w-[95%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'ml-auto bg-brand text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <MessageText text={m.content} />
              </p>
            ))}
            {pending && messages[messages.length - 1]?.role === 'user' && (
              <p className='text-xs text-gray-400'>A responder…</p>
            )}
            <div ref={endRef} />
          </div>

          <form
            className='flex gap-2 border-t border-gray-100 p-3'
            onSubmit={e => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={800}
              placeholder='Escreva a sua dúvida'
              className='min-w-0 flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand'
            />
            <button
              type='submit'
              disabled={pending || !input.trim()}
              className='rounded-full bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50'
            >
              Enviar
            </button>
          </form>
        </section>
      )}

      {/* ───────── Desktop: assistente à esquerda (WhatsApp à direita) ───────── */}
      <div
        className='fixed bottom-6 left-6 z-50 hidden md:block'
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* O pb-3 (em vez de margem) mantém o rato "dentro" ao passar do
            botão para o balão. */}
        <AnimatePresence>
          {bubbleVisible && (
            <motion.div
              key='assistant-bubble'
              className='absolute bottom-full left-0 pb-3'
              style={{ transformOrigin: '1.75rem 100%' }}
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 10, scale: 0.85 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 6, scale: 0.95 }
              }
              transition={
                reduceMotion
                  ? { duration: 0.15 }
                  : { type: 'spring', stiffness: 420, damping: 26 }
              }
            >
              <div className='relative flex items-center gap-1 whitespace-nowrap rounded-2xl rounded-bl-md border border-gray-100 bg-white py-1.5 pl-4 pr-1.5 shadow-lg'>
                <button
                  type='button'
                  onClick={openChat}
                  className='py-1 text-left'
                >
                  <span className='block text-sm font-semibold text-chumbo'>
                    Oi! Posso ajudar?
                  </span>
                  <span className='block text-[11px] text-gray-500'>
                    Assistente virtual Pro-Lite
                  </span>
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setTeaser(false);
                    setHovered(false);
                  }}
                  className='flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                  aria-label='Dispensar mensagem'
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type='button'
          onClick={toggleChat}
          whileHover={reduceMotion ? undefined : { scale: 1.08 }}
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className='relative block h-14 w-14 rounded-full shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'
          aria-label={
            open ? 'Fechar assistente' : 'Abrir assistente da Pro-Lite'
          }
          aria-expanded={open}
        >
          <LauncherFace
            showClose={open}
            bobbing={bubbleVisible}
            reduceMotion={reduceMotion}
          />
          {/* Ponto verde: o assistente responde a qualquer hora */}
          {!open && (
            <span className='absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-white' />
          )}
        </motion.button>
      </div>

      {/* ───────── Mobile: botão único de atendimento, à direita ───────── */}
      <div className='md:hidden'>
        {/* Toque fora fecha o mini-menu */}
        {menuOpen && (
          <button
            type='button'
            tabIndex={-1}
            aria-hidden='true'
            onClick={() => setMenuOpen(false)}
            className='fixed inset-0 z-40 cursor-default'
          />
        )}

        <motion.div
          className='fixed right-4 z-50'
          style={{
            bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            pointerEvents: mobileVisible ? 'auto' : 'none',
          }}
          inert={!mobileVisible}
          initial={false}
          animate={
            mobileVisible
              ? { opacity: 1, y: 0, scale: 1 }
              : reduceMotion
                ? { opacity: 0, y: 0, scale: 1 }
                : { opacity: 0, y: 20, scale: 0.85 }
          }
          transition={
            reduceMotion
              ? { duration: 0.15 }
              : { type: 'spring', stiffness: 380, damping: 30 }
          }
        >
          <AnimatePresence>
            {mobileBubble && (
              <motion.div
                key='assistant-bubble-mobile'
                className='absolute bottom-full right-0 pb-2.5'
                style={{ transformOrigin: 'calc(100% - 1.5rem) 100%' }}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 10, scale: 0.85 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 6, scale: 0.95 }
                }
                transition={
                  reduceMotion
                    ? { duration: 0.15 }
                    : { type: 'spring', stiffness: 420, damping: 26 }
                }
              >
                <div className='flex items-center gap-0.5 whitespace-nowrap rounded-2xl rounded-br-md border border-gray-100 bg-white py-1 pl-3.5 pr-1 shadow-lg'>
                  <button
                    type='button'
                    onClick={toggleMobile}
                    className='py-1.5 text-sm font-semibold text-chumbo'
                  >
                    Posso ajudar?
                  </button>
                  <button
                    type='button'
                    onClick={() => setTeaser(false)}
                    className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400'
                    aria-label='Dispensar mensagem'
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {menuOpen && (
              <motion.ul
                key='atendimento-menu'
                id='atendimento-menu'
                className='absolute bottom-full right-0 flex flex-col items-end gap-2 pb-3'
                initial='closed'
                animate='open'
                exit='closed'
                variants={{
                  open: {
                    transition: {
                      staggerChildren: reduceMotion ? 0 : 0.05,
                      staggerDirection: -1,
                    },
                  },
                  closed: {},
                }}
              >
                {[
                  {
                    key: 'assistant',
                    title: 'Assistente virtual',
                    hint: 'Resposta na hora',
                  },
                  {
                    key: 'whatsapp',
                    title: 'WhatsApp',
                    hint: 'Fale com a nossa equipe',
                  },
                ].map(item => {
                  const content = (
                    <>
                      <span className='text-right'>
                        <span className='block text-sm font-semibold text-chumbo'>
                          {item.title}
                        </span>
                        <span className='block text-[11px] text-gray-500'>
                          {item.hint}
                        </span>
                      </span>
                      {item.key === 'assistant' ? (
                        <span className='h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-100'>
                          <AssistantAvatar className='h-full w-full scale-[1.15]' />
                        </span>
                      ) : (
                        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-white'>
                          <MessageCircle size={20} />
                        </span>
                      )}
                    </>
                  );
                  const cls =
                    'flex items-center gap-3 whitespace-nowrap rounded-full border border-gray-100 bg-white py-1.5 pl-4 pr-1.5 shadow-lg active:bg-gray-50';
                  return (
                    <motion.li
                      key={item.key}
                      variants={{
                        open: { opacity: 1, y: 0, scale: 1 },
                        closed: reduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: 12, scale: 0.9 },
                      }}
                      transition={
                        reduceMotion
                          ? { duration: 0.12 }
                          : { type: 'spring', stiffness: 460, damping: 30 }
                      }
                      style={{ transformOrigin: '100% 100%' }}
                    >
                      {item.key === 'assistant' ? (
                        <button type='button' onClick={openChat} className={cls}>
                          {content}
                        </button>
                      ) : (
                        <a
                          href={WHATSAPP_URL}
                          target='_blank'
                          rel='noopener noreferrer'
                          onClick={() => setMenuOpen(false)}
                          className={cls}
                        >
                          {content}
                        </a>
                      )}
                    </motion.li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>

          <motion.button
            type='button'
            onClick={toggleMobile}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            className='relative block h-12 w-12 rounded-full shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'
            aria-label={
              open
                ? 'Fechar assistente'
                : menuOpen
                  ? 'Fechar opções de atendimento'
                  : 'Atendimento: assistente virtual ou WhatsApp'
            }
            aria-expanded={open || menuOpen}
            aria-controls={menuOpen ? 'atendimento-menu' : undefined}
          >
            <LauncherFace
              showClose={open || menuOpen}
              bobbing={mobileBubble}
              reduceMotion={reduceMotion}
            />
            {!open && !menuOpen && (
              <span className='absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white' />
            )}
          </motion.button>
        </motion.div>
      </div>
    </>
  );
}
