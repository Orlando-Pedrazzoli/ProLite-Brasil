// src/components/home/SectionHeading.tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

// ═══════════════════════════════════════════════════════════════
// TÍTULO DE SECÇÃO — padrão único para toda a home
// ═══════════════════════════════════════════════════════════════
// Eyebrow em Geist Mono azul (opcional) + título grande semibold,
// o mesmo estilo do CategoryBento. Para mudar o aspeto dos títulos
// da home inteira, altera-se SÓ aqui.
//
// Recuo lateral: px-6 no mobile e px-10 no desktop — o MESMO padding
// interno dos cards do bento (p-6 / md:p-10). Assim o título alinha
// verticalmente com o texto dentro dos cards em vez de ficar colado
// à borda do container (que tem só 16px, igual ao gap da grelha).
//
// `action` renderiza à direita, alinhado à base (ex.: setas de um
// carrossel, link "ver tudo").

interface SectionHeadingProps {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export const SECTION_HEADING_INSET = 'px-6 md:px-10';

export default function SectionHeading({
  title,
  eyebrow,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'mb-6 flex items-end justify-between gap-6 md:mb-8',
        SECTION_HEADING_INSET,
        className,
      )}
    >
      <div className='max-w-3xl'>
        {eyebrow && (
          <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark'>
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            'text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl',
            eyebrow && 'mt-2',
          )}
        >
          {title}
        </h2>
      </div>
      {action && <div className='shrink-0 pb-1'>{action}</div>}
    </div>
  );
}
