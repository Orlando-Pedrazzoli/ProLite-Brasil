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
'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import AssistantAvatar from '@/components/shared/AssistantAvatar';
import { getCookieConsent } from '@/components/shared/CookieConsent';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Quanto tempo depois de a página estar livre o balão aparece */
const TEASER_DELAY_MS = 3500;
/** Quanto tempo o balão fica antes de sumir sozinho */
const TEASER_VISIBLE_MS = 9000;
/** Marca na sessão: o balão já apareceu, não repetir a cada página */
const TEASER_KEY = 'prolite-assistant-teaser';

function subscribeConsent(onChange: () => void) {
  window.addEventListener('cookie-consent-updated', onChange);
  return () =>
    window.removeEventListener('cookie-consent-updated', onChange);
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
  const reduceMotion = useReducedMotion();
  const consentDecided = useSyncExternalStore(
    subscribeConsent,
    () => getCookieConsent() !== null,
    () => false,
  );
  const endRef = useRef<HTMLDivElement>(null);
  const hidden =
    pathname.startsWith('/admin') || pathname.startsWith('/pos');

  // Mostra o balão uma vez por sessão, com a página já livre do banner
  useEffect(() => {
    if (hidden || open || !consentDecided) return;
    try {
      if (sessionStorage.getItem(TEASER_KEY) === '1') return;
    } catch {
      /* sem storage: segue e mostra */
    }
    const timer = setTimeout(() => {
      setTeaser(true);
      markTeaserSeen();
    }, TEASER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hidden, open, consentDecided]);

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
    markTeaserSeen();
    setOpen(true);
  };

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
          className='fixed bottom-24 left-4 z-50 flex h-[min(32rem,calc(100vh-8rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl'
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

      <div
        className='fixed bottom-6 left-6 z-50'
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Balão "Posso ajudar?" — fica por cima do botão para não chegar
            ao botão do WhatsApp em ecrãs estreitos. O pb-3 (em vez de
            margem) mantém o rato "dentro" ao passar do botão para o balão. */}
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
          <span
            className={`absolute inset-0 overflow-hidden rounded-full ring-2 ring-white transition-colors duration-200 ${
              open ? 'bg-chumbo' : 'bg-brand-100'
            }`}
          >
            {/* Avatar: entra a subir, sobe e desce enquanto o balão está
                visível e desce para fora quando o chat abre. */}
            <motion.span
              className='absolute inset-0'
              initial={reduceMotion ? false : { y: '110%' }}
              animate={
                open
                  ? { y: '110%' }
                  : bubbleVisible && !reduceMotion
                    ? { y: ['7%', '-5%', '7%'] }
                    : { y: reduceMotion ? '0%' : '7%' }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : bubbleVisible && !open
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
                open
                  ? { opacity: 1, scale: 1, rotate: 0 }
                  : { opacity: 0, scale: 0.6, rotate: -45 }
              }
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              <X size={26} />
            </motion.span>
          </span>
          {/* Ponto verde: o assistente responde a qualquer hora */}
          {!open && (
            <span className='absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-white' />
          )}
        </motion.button>
      </div>
    </>
  );
}
