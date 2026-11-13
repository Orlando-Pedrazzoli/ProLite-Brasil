'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MessageSquare, X } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME =
  'Olá, sou o assistente virtual da Pro-Lite. Pergunte sobre produtos, frete, pagamento ou trocas. O estado de uma encomenda só aparece se você estiver logado.';

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
  const endRef = useRef<HTMLDivElement>(null);
  const hidden =
    pathname.startsWith('/admin') || pathname.startsWith('/pos');

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open, pending]);

  if (hidden) return null;

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
            <div>
              <p className='text-sm font-semibold'>Assistente Pro-Lite</p>
              <p className='text-[11px] text-gray-300'>
                Informações do site. WhatsApp continua no botão verde.
              </p>
            </div>
            <button
              type='button'
              onClick={() => setOpen(false)}
              className='rounded-full p-1 hover:bg-white/10'
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
            {pending && (
              <p className='text-xs text-gray-400'>A consultar o site…</p>
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

      <button
        type='button'
        onClick={() => setOpen(v => !v)}
        className='fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-chumbo text-white shadow-lg transition-all hover:scale-110'
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente da Pro-Lite'}
      >
        {open ? <X size={26} /> : <MessageSquare size={26} />}
      </button>
    </>
  );
}
