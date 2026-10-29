// 📄 src/app/revendedor/tabela-de-precos/PriceTableClient.tsx
// Tabela de preços do revendedor — UI (mesmo espírito da tabela do
// Elite Surfing: secções por categoria, foto + código + nome + preço, em
// LISTA ou em GRADE/catálogo), com busca, salto por categoria e botão
// "Imprimir / salvar PDF" (regras @media print em globals.css,
// secção "Tabela de preços do revendedor").
//
// Colunas: PREÇO REVENDA (costPrice — o que o lojista paga) e SUGERIDO
// (price — o mesmo preço praticado no site, para o lojista alinhar).
'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Search,
  LayoutList,
  LayoutGrid,
  Printer,
  ImageOff,
  Info,
} from 'lucide-react';
import { company } from '@/lib/config/company';
import { cardImage } from '@/lib/utils/cardImage';
import { formatCNPJ } from '@/lib/utils/validators';

export interface PriceTableRow {
  id: string;
  sku: string;
  name: string;
  slug: string;
  image: string;
  wholesale: number;
  retail: number;
  size: string;
  published: boolean;
}
export interface PriceTableGroup {
  title: string;
  rows: PriceTableRow[];
}
export interface PriceTableSection {
  title: string;
  slug: string;
  groups: PriceTableGroup[];
}

interface Props {
  sections: PriceTableSection[];
  reseller: { tradeName: string; contactName: string; cnpj: string };
  generatedAt: string;
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PriceTableClient({
  sections,
  reseller,
  generatedAt,
}: Props) {
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return sections;
    return sections
      .map(s => ({
        ...s,
        groups: s.groups
          .map(g => ({
            ...g,
            rows: g.rows.filter(
              r => norm(r.name).includes(q) || r.sku.includes(q),
            ),
          }))
          .filter(g => g.rows.length),
      }))
      .filter(s => s.groups.length);
  }, [sections, query]);

  const total = useMemo(
    () =>
      sections.reduce(
        (n, s) => n + s.groups.reduce((m, g) => m + g.rows.length, 0),
        0,
      ),
    [sections],
  );

  const date = new Date(generatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });

  return (
    <div className='max-w-6xl mx-auto px-4 py-8 print:px-0 print:py-0'>
      {/* ═══ CABEÇALHO ═══ */}
      <div className='mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4'>
        <div>
          <p className='text-brand font-bold uppercase tracking-widest text-xs mb-1'>
            Pro-Lite · Tabela de preços para revendedores
          </p>
          <h1 className='text-2xl md:text-3xl font-black text-gray-900'>
            {reseller.tradeName}
          </h1>
          <p className='text-sm text-gray-500 mt-1'>
            {reseller.contactName} · CNPJ {formatCNPJ(reseller.cnpj)} ·
            atualizada em {date} · {total} produtos
          </p>
        </div>
        <div className='flex items-center gap-2 print:hidden'>
          <div className='flex rounded-lg border border-gray-200 bg-white p-1'>
            <button
              onClick={() => setLayout('list')}
              className={`rounded-md p-2 ${layout === 'list' ? 'bg-chumbo text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              title='Lista'
              aria-label='Ver em lista'
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setLayout('grid')}
              className={`rounded-md p-2 ${layout === 'grid' ? 'bg-chumbo text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              title='Catálogo com fotos'
              aria-label='Ver em grade'
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className='inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-bold px-4 py-2.5 transition-colors'
          >
            <Printer size={16} /> Imprimir / salvar PDF
          </button>
        </div>
      </div>

      {/* ═══ CONDIÇÕES ═══ */}
      <div className='mb-6 flex items-start gap-3 rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-brand-darker'>
        <Info size={18} className='shrink-0 mt-0.5' />
        <div className='leading-relaxed'>
          <p>
            <strong>Preço revenda</strong> é o valor que a sua loja paga à
            Pro-Lite. <strong>Sugerido</strong> é o preço de venda ao consumidor
            praticado no nosso site — recomendamos alinhar para não haver
            concorrência de preço com a marca. Valores em reais, sem frete;
            impostos conforme nota fiscal.
          </p>
          <p className='mt-1'>
            Pedidos e condições de pagamento: {company.email} · WhatsApp{' '}
            {company.whatsappDisplay}. Esta tabela é confidencial e de uso
            exclusivo do revendedor cadastrado.
          </p>
        </div>
      </div>

      {/* ═══ BUSCA + ÍNDICE ═══ */}
      <div className='mb-6 flex flex-col md:flex-row gap-3 print:hidden'>
        <div className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 md:w-80'>
          <Search size={16} className='text-gray-400' />
          <input
            type='text'
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Buscar por nome ou código'
            className='w-full text-sm outline-none'
          />
        </div>
        <nav className='flex flex-wrap gap-1.5'>
          {sections.map(s => (
            <a
              key={s.slug}
              href={`#sec-${s.slug}`}
              className='rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-brand hover:text-brand'
            >
              {s.title}
            </a>
          ))}
        </nav>
      </div>

      {filtered.length === 0 && (
        <p className='py-16 text-center text-gray-400'>
          Nenhum produto encontrado para “{query}”.
        </p>
      )}

      {/* ═══ SECÇÕES ═══ */}
      <div className='space-y-8'>
        {filtered.map(section => (
          <section
            key={section.slug}
            id={`sec-${section.slug}`}
            className='scroll-mt-24 break-inside-avoid-page'
          >
            <h2 className='bg-chumbo text-white text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-t-lg print:rounded-none'>
              {section.title}
            </h2>
            <div className='bg-white border border-t-0 border-gray-200 rounded-b-lg overflow-hidden print:rounded-none'>
              {section.groups.map((group, gi) => (
                <div key={group.title || gi}>
                  {group.title && (
                    <h3 className='bg-gray-50 border-y border-gray-100 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-500'>
                      {group.title}
                    </h3>
                  )}
                  {layout === 'list' ? (
                    <ListRows rows={group.rows} />
                  ) : (
                    <GridCards rows={group.rows} />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className='mt-8 text-center text-[11px] text-gray-400'>
        {company.legalName} · CNPJ {company.cnpj} · {company.address.city} -{' '}
        {company.address.state} · Tabela gerada em {date} para{' '}
        {reseller.tradeName}. Preços sujeitos a alteração sem aviso prévio.
      </p>
    </div>
  );
}

// ─────────────────────────── Lista ───────────────────────────
function ListRows({ rows }: { rows: PriceTableRow[] }) {
  return (
    <table className='w-full text-sm'>
      <thead className='sr-only'>
        <tr>
          <th>Foto</th>
          <th>Código</th>
          <th>Produto</th>
          <th>Preço revenda</th>
          <th>Sugerido</th>
        </tr>
      </thead>
      <tbody className='divide-y divide-gray-100'>
        {rows.map(r => (
          <tr key={r.id} className='hover:bg-gray-50'>
            <td className='w-14 px-3 py-1.5'>
              <Thumb src={r.image} alt={r.name} size={44} />
            </td>
            <td className='w-20 px-2 py-1.5 font-mono text-xs text-gray-400'>
              {r.sku}
            </td>
            <td className='px-2 py-1.5 text-gray-800'>
              {r.name}
              {!r.published && (
                <span className='ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-400 print:hidden'>
                  em breve no site
                </span>
              )}
            </td>
            <td className='w-32 px-2 py-1.5 text-right whitespace-nowrap'>
              <span className='block text-[10px] uppercase tracking-wide text-gray-400 md:hidden'>
                Revenda
              </span>
              <span className='font-bold text-green-700'>
                {brl(r.wholesale)}
              </span>
            </td>
            <td className='w-28 px-3 py-1.5 text-right whitespace-nowrap text-gray-400'>
              <span className='block text-[10px] uppercase tracking-wide md:hidden'>
                Sugerido
              </span>
              {brl(r.retail)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─────────────────────────── Grade / catálogo ───────────────────────────
function GridCards({ rows }: { rows: PriceTableRow[] }) {
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-100'>
      {rows.map(r => (
        <div key={r.id} className='print-card bg-white p-3 flex flex-col'>
          <Thumb
            src={r.image}
            alt={r.name}
            size={160}
            className='w-full aspect-[4/5]'
          />
          <p className='mt-2 font-mono text-[10px] text-gray-400'>{r.sku}</p>
          <p className='text-sm font-semibold text-gray-800 leading-snug flex-1'>
            {r.name}
          </p>
          <p className='mt-1.5 text-base font-black text-green-700'>
            {brl(r.wholesale)}
          </p>
          <p className='text-[11px] text-gray-400'>sugerido {brl(r.retail)}</p>
        </div>
      ))}
    </div>
  );
}

function Thumb({
  src,
  alt,
  size,
  className = '',
}: {
  src: string;
  alt: string;
  size: number;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded bg-gray-50 text-gray-300 ${className}`}
        style={className ? undefined : { width: size, height: size }}
      >
        <ImageOff size={Math.min(20, size / 2)} />
      </div>
    );
  }
  return (
    <div
      className={`relative overflow-hidden rounded bg-white ${className}`}
      style={className ? undefined : { width: size, height: size }}
    >
      <Image
        src={cardImage(src)}
        alt={alt}
        fill
        sizes={`${size}px`}
        className='object-contain'
      />
    </div>
  );
}
