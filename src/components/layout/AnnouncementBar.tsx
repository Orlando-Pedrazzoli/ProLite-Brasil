'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { company } from '@/lib/config/company';

// Cada mensagem é um link para a secção correspondente da página de condições
const messages = [
  {
    text: `Frete grátis todo Brasil acima de R$ ${company.shipping.freeShippingMinValue}`,
    href: '/condicoes#frete-gratis',
  },
  {
    text: `${company.payment.pixDiscountPercent}% OFF pagamentos no Pix à vista`,
    href: '/condicoes#desconto-pix',
  },
  {
    text: `Parcele em até ${company.payment.maxInstallments}x sem juros no cartão de crédito`,
    href: '/condicoes#parcelamento',
  },
];

const INTERVAL_MS = 2000;

export default function AnnouncementBar() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // Carousel automático; pausa enquanto o rato está sobre a mensagem
  // para o user conseguir clicar sem ela mudar debaixo do cursor.
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % messages.length);
    }, INTERVAL_MS);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <div className='bg-chumbo text-white py-2 px-4 text-xs sm:text-sm font-medium'>
      <div className='max-w-7xl mx-auto flex items-center justify-between'>
        {/* Spacer for centering on desktop */}
        <div className='hidden md:block w-16' />

        {/* Messages carousel */}
        <div
          className='flex-1 relative h-5 overflow-hidden'
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          aria-live='polite'
        >
          {messages.map((msg, i) => (
            <Link
              key={msg.href}
              href={msg.href}
              tabIndex={i === current ? 0 : -1}
              aria-hidden={i !== current}
              className={`absolute inset-0 flex items-center justify-center text-center hover:underline underline-offset-2 transition-all duration-500 ease-out ${
                i === current
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
            >
              {msg.text}
            </Link>
          ))}
        </div>

        {/* Social Icons */}
        <div className='flex items-center gap-2 ml-3 flex-shrink-0'>
          {company.social.instagram && (
            <Link
              href={company.social.instagram}
              target='_blank'
              rel='noopener noreferrer'
              className='w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300 group'
              aria-label='Instagram'
            >
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                className='text-white group-hover:text-brand transition-colors duration-300'
              >
                <rect
                  x='2'
                  y='2'
                  width='20'
                  height='20'
                  rx='5'
                  stroke='currentColor'
                  strokeWidth='2'
                />
                <circle
                  cx='12'
                  cy='12'
                  r='5'
                  stroke='currentColor'
                  strokeWidth='2'
                />
                <circle cx='18' cy='6' r='1.5' fill='currentColor' />
              </svg>
            </Link>
          )}
          {company.social.facebook && (
            <Link
              href={company.social.facebook}
              target='_blank'
              rel='noopener noreferrer'
              className='w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300 group'
              aria-label='Facebook'
            >
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='currentColor'
                className='text-white group-hover:text-brand transition-colors duration-300'
              >
                <path d='M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z' />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
