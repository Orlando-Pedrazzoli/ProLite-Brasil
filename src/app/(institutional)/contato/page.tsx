// src/app/(institutional)/contato/page.tsx
// 🔍 Server wrapper SEO da página de contato.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: 'Contato — Fale com a Pro-Lite',
  description:
    'Fale com a equipe da Pro-Lite: dúvidas sobre produtos, pedidos, envios e parcerias. Atendimento por e-mail e WhatsApp.',
  alternates: { canonical: '/contato' },
};

export default function ContatoPage() {
  return (
    <Suspense>
      <ContactPageClient />
    </Suspense>
  );
}
