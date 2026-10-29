// src/app/(institutional)/revendedores/page.tsx
// 🔍 Server wrapper SEO da página "Seja um Revendedor".
// Rota pública: /revendedores (CTA da navbar). O formulário envia para
// POST /api/resellers; a aprovação é feita em /admin/revendedores.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import ResellerPageClient from './ResellerPageClient';

export const metadata: Metadata = {
  title: 'Seja um Revendedor Pro-Lite — Cadastro de Lojistas',
  description:
    'Seja um revendedor Pro-Lite: capas, leashes, decks, quilhas, parafinas, racks e acessórios de surf fabricados no Brasil há 40 anos. Cadastre a sua loja e conheça as condições comerciais para lojistas.',
  alternates: { canonical: '/revendedores' },
};

export default function RevendedoresPage() {
  return (
    <Suspense>
      <ResellerPageClient />
    </Suspense>
  );
}
