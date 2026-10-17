// src/components/admin/ProductCardPreview.tsx
'use client';

import Image from 'next/image';
import { cardImage } from '@/lib/utils/cardImage';

// ═══════════════════════════════════════════════════════════════
// PRÉ-VISUALIZAÇÃO DO CARD — usada no ProductForm (admin)
// ═══════════════════════════════════════════════════════════════
// Mostra como a imagem principal vai aparecer no ProductCard da loja,
// nos dois tamanhos reais: grid de 2 colunas no telemóvel (~170px) e
// grid de 4 colunas no desktop (~300px). Usa exatamente o mesmo
// enquadramento do card (cardImage → trim + pad 4:5, object-contain,
// p-2), por isso o que o admin vê aqui é o que o cliente vê no site.

interface ProductCardPreviewProps {
  src?: string;
  name?: string;
  price?: number;
}

function Frame({
  src,
  name,
  price,
  width,
  label,
  textSize,
}: {
  src: string;
  name: string;
  price?: number;
  width: number;
  label: string;
  textSize: string;
}) {
  return (
    <div className='flex flex-col items-center gap-2'>
      <span className='text-[11px] font-medium uppercase tracking-wide text-gray-400'>
        {label}
      </span>
      <div
        className='bg-white rounded-lg overflow-hidden shadow-sm ring-1 ring-black/5'
        style={{ width }}
      >
        <div className='relative aspect-[4/5] bg-white overflow-hidden'>
          <Image
            src={cardImage(src)}
            alt={name || 'Pré-visualização'}
            fill
            sizes={`${width}px`}
            className='object-contain object-center p-2'
          />
        </div>
        <div className={`p-2 text-center ${textSize}`}>
          <p className='text-gray-800 font-medium line-clamp-2 min-h-[2.5em]'>
            {name || 'Nome do produto'}
          </p>
          {price ? (
            <p className='mt-1 font-bold text-brand'>
              {price.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ProductCardPreview({
  src,
  name = '',
  price,
}: ProductCardPreviewProps) {
  if (!src) return null;

  return (
    <div className='mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4'>
      <p className='text-sm font-medium text-gray-700'>
        Como vai aparecer na loja
      </p>
      <p className='text-xs text-gray-500 mb-4'>
        A margem branca da foto é removida automaticamente e o produto é
        enquadrado em 4:5. Se ainda assim ficar pequeno ou torto, a foto
        original tem fundo não uniforme — recorta-a antes de enviar.
      </p>
      <div className='flex flex-wrap items-start gap-8'>
        <Frame
          src={src}
          name={name}
          price={price}
          width={170}
          label='Celular (2 colunas)'
          textSize='text-xs'
        />
        <Frame
          src={src}
          name={name}
          price={price}
          width={290}
          label='Desktop (4 colunas)'
          textSize='text-sm'
        />
      </div>
    </div>
  );
}
