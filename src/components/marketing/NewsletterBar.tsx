// 📄 src/components/marketing/NewsletterBar.tsx
// Barra de newsletter do rodapé — agora FUNCIONAL.
//
// Antes era só visual (input e botão sem handler). Agora:
//   • POST /api/newsletter com source 'footer' → grava Subscriber (aparece
//     em /admin/newsletter) e envia o cupom de boas-vindas por e-mail;
//   • consentimento LGPD: checkbox explícito (a API exige consent=true);
//   • estados: a enviar / sucesso (mostra o cupom, substitui o formulário)
//     / já inscrito;
//   • MOBILE: texto quebra em linhas (sem whitespace-nowrap), input e
//     botão empilhados em ecrãs pequenos e lado a lado a partir de sm.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isValidEmail } from '@/lib/utils/validators';

export default function NewsletterBar() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error('Digite um e-mail válido.');
      return;
    }
    if (!consent) {
      toast.error('Marque a caixa para aceitar receber nossos e-mails.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent: true, source: 'footer' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Não foi possível concluir a inscrição.');
        return;
      }
      setDone(true);
      if (data.alreadySubscribed) {
        toast.success(data.message || 'Você já está inscrito!');
      } else {
        setCoupon(data.couponCode || null);
        toast.success('Inscrição confirmada!');
      }
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    if (!coupon) return;
    try {
      await navigator.clipboard.writeText(coupon);
      toast.success('Cupom copiado!');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  return (
    <div className='bg-brand'>
      <div className='max-w-7xl mx-auto px-4 py-6 md:py-5'>
        {done ? (
          <div className='flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 text-white text-center'>
            <span className='inline-flex items-center gap-2 font-bold text-sm md:text-base'>
              <Check size={18} /> Inscrição confirmada!
            </span>
            {coupon ? (
              <button
                onClick={copy}
                className='inline-flex items-center gap-2 rounded-md bg-white/15 border border-white/40 px-4 py-2 text-sm hover:bg-white/25 transition-colors'
                title='Copiar cupom'
              >
                Seu cupom de 10% OFF:{' '}
                <span className='font-black tracking-widest'>{coupon}</span>
                <Copy size={14} />
              </button>
            ) : (
              <span className='text-sm text-white/90'>
                Este e-mail já estava na nossa lista. Obrigado!
              </span>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className='flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6'
          >
            <div className='text-center lg:text-left'>
              <p className='text-white font-bold text-sm md:text-base leading-snug'>
                CADASTRE-SE EM NOSSA NEWSLETTER E GANHE{' '}
                <span className='whitespace-nowrap'>10% OFF</span> NA PRIMEIRA
                COMPRA
              </p>
              <p className='text-white/80 text-xs mt-0.5'>
                Novidades, lançamentos e promoções exclusivas.
              </p>
            </div>

            <div className='w-full max-w-lg'>
              <div className='flex flex-col sm:flex-row gap-2 sm:gap-0'>
                <label htmlFor='footer-newsletter-email' className='sr-only'>
                  Seu e-mail
                </label>
                <input
                  id='footer-newsletter-email'
                  type='email'
                  inputMode='email'
                  autoComplete='email'
                  placeholder='Insira seu e-mail aqui'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className='flex-1 px-4 py-3 text-sm text-gray-900 bg-white rounded-md sm:rounded-r-none focus:outline-none min-w-0'
                />
                <button
                  type='submit'
                  disabled={sending}
                  className='inline-flex items-center justify-center gap-2 px-6 py-3 bg-chumbo text-white text-sm font-bold rounded-md sm:rounded-l-none hover:bg-chumbo-light disabled:opacity-70 transition-colors whitespace-nowrap'
                >
                  {sending && <Loader2 size={16} className='animate-spin' />}
                  CADASTRAR
                </button>
              </div>
              <label className='mt-2 flex items-start gap-2 cursor-pointer text-[11px] leading-snug text-white/85'>
                <input
                  type='checkbox'
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className='mt-0.5 h-3.5 w-3.5 flex-shrink-0 accent-white'
                />
                <span>
                  Aceito receber e-mails com novidades e promoções da Pro-Lite e
                  concordo com a{' '}
                  <Link href='/politica-privacidade' className='underline'>
                    política de privacidade
                  </Link>
                  . Cancele quando quiser.
                </span>
              </label>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
