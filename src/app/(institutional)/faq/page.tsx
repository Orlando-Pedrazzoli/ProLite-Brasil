// src/app/(institutional)/faq/page.tsx
// 🔍 Server wrapper SEO da página de FAQ.
// Injeta JSON-LD FAQPage + BreadcrumbList a partir da mesma fonte de dados
// que a página renderiza (src/lib/content/faq.ts) — o Google exige que as
// perguntas do schema estejam visíveis na página.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import FaqPageClient from './FaqPageClient';
import JsonLd from '@/components/seo/JsonLd';
import { faqPageJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { faqEntries } from '@/lib/content/faq';
import { absoluteUrl, DEFAULT_OG_IMAGE } from '@/lib/seo/config';

const TITLE = 'Perguntas Frequentes (FAQ)';
const DESCRIPTION =
  'Dúvidas sobre pedidos, pagamentos, prazos de entrega, trocas e devoluções na Pro-Lite. Encontre respostas rápidas antes de comprar.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/faq' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/faq'),
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: TITLE }],
  },
};

export default function FAQPage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(faqEntries)} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'FAQ', path: '/faq' }])} />
      <Suspense>
        <FaqPageClient />
      </Suspense>
    </>
  );
}
