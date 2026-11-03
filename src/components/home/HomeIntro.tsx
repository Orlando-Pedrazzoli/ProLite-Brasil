// src/components/home/HomeIntro.tsx
// ═══════════════════════════════════════════════════════════════
// INTRO DA HOME — único <h1> da página
// ═══════════════════════════════════════════════════════════════
// Server component (sem JS no cliente). O hero é um carrossel de
// imagens carregado no cliente, por isso o H1 vive aqui: fica no HTML
// inicial, é visível para utilizadores e crawlers, e segue o mesmo
// recuo/estilo do SectionHeading para alinhar com o resto da home.
// Todos os outros títulos da home são <h2> (SectionHeading).

import { SECTION_HEADING_INSET } from '@/components/home/SectionHeading';
import { HOME_H1 } from '@/lib/seo/config';
import { company } from '@/lib/config/company';
import { cn } from '@/lib/utils/cn';

export default function HomeIntro() {
  return (
    <section className='pt-10 pb-2 md:pt-14'>
      <div className='container-home'>
        <div className={cn('max-w-3xl', SECTION_HEADING_INSET)}>
          <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark'>
            Pro-Lite · Fabricação própria · São Paulo
          </p>
          <h1 className='mt-2 text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl'>
            {HOME_H1}
          </h1>
          <p className='mt-3 text-sm/6 text-gray-600 md:text-base/7'>
            {company.slogan}. Capas de prancha, leashes, decks, quilhas e
            parafinas desenvolvidos e fabricados pela {company.tradeName} em
            São Paulo, com envio para todo o Brasil e até{' '}
            {company.payment.maxInstallments}x sem juros.
          </p>
        </div>
      </div>
    </section>
  );
}
