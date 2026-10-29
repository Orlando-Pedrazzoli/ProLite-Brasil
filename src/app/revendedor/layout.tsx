// 📄 src/app/revendedor/layout.tsx
// Área do revendedor aprovado (tabela de preços). Layout próprio, sem a
// navbar da loja: cabeçalho mínimo com o logo e nada que distraia da
// tabela — e limpo na impressão (print:hidden).
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { company } from '@/lib/config/company';

export const metadata: Metadata = {
  title: 'Área do Revendedor — Pro-Lite',
  robots: { index: false, follow: false },
};

export default function ResellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <header className='bg-white border-b border-gray-200 print:hidden'>
        <div className='max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4'>
          <Link href='/' aria-label='Pro-Lite — página inicial'>
            <Image
              src='/images/logo_nav_origin.png'
              alt='Pro-Lite'
              width={5246}
              height={1094}
              priority
              sizes='180px'
              className='h-9 w-auto object-contain'
            />
          </Link>
          <p className='text-xs font-bold uppercase tracking-widest text-gray-400'>
            Área do Revendedor
          </p>
        </div>
      </header>
      <main className='flex-1'>{children}</main>
      <footer className='border-t border-gray-200 bg-white print:hidden'>
        <div className='max-w-6xl mx-auto px-4 py-4 text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1'>
          <span>
            {company.legalName} · CNPJ {company.cnpj}
          </span>
          <span>{company.email}</span>
          <span>WhatsApp {company.whatsappDisplay}</span>
        </div>
      </footer>
    </div>
  );
}
