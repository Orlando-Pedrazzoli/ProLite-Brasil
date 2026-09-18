// src/app/(institutional)/tarifas-aereas/page.tsx
// Guia de tarifas aéreas para pranchas. Conteúdo 100% próprio da
// Pro-Lite Brasil; os dados vêm de src/lib/config/airlineFees.ts.

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Plane,
  ExternalLink,
  ShieldCheck,
  Ruler,
  Scale,
  Info,
} from 'lucide-react';
import {
  airlineFees,
  AIRLINE_FEES_LAST_REVIEW,
  type AirlineFee,
} from '@/lib/config/airlineFees';

export const metadata: Metadata = {
  title: 'Tarifas aéreas para pranchas de surf',
  description:
    'Quanto custa levar prancha de surf no avião? Veja como LATAM, GOL, Azul e companhias internacionais cobram, os limites de tamanho e peso e como embalar.',
  alternates: { canonical: '/tarifas-aereas' },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Companhia com informação suficiente para merecer um cartão completo. */
function hasDetails(a: AirlineFee): boolean {
  return a.rules.length > 0 || Boolean(a.fee);
}

function AirlineCard({ airline }: { airline: AirlineFee }) {
  return (
    <article className='bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col'>
      <header className='mb-4'>
        <h3 className='text-lg font-bold text-gray-900'>{airline.name}</h3>
        {airline.classification && (
          <p className='text-sm text-gray-500 mt-1'>{airline.classification}</p>
        )}
      </header>

      <div className='rounded-md bg-brand-50 border border-brand-100 px-4 py-3 mb-4'>
        {airline.fee ? (
          <>
            <p className='text-base font-bold text-brand-darker'>
              {airline.fee.value}
            </p>
            {airline.fee.detail && (
              <p className='text-sm text-gray-700 mt-1 leading-relaxed'>
                {airline.fee.detail}
              </p>
            )}
          </>
        ) : (
          <p className='text-sm font-medium text-brand-darker'>
            Confirme o valor atual no site oficial antes de comprar a passagem.
          </p>
        )}
      </div>

      {airline.rules.length > 0 && (
        <ul className='space-y-2 text-sm text-gray-700 leading-relaxed mb-5'>
          {airline.rules.map(rule => (
            <li key={rule} className='flex gap-2'>
              <span
                aria-hidden
                className='mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand'
              />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      )}

      <footer className='mt-auto flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100'>
        <a
          href={airline.officialUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1.5 text-sm font-bold text-brand-dark hover:text-brand-darker transition-colors'
        >
          Ver política oficial
          <ExternalLink size={14} />
        </a>
        {airline.verifiedAt && (
          <span className='text-xs text-gray-500'>
            Conferido em {formatDate(airline.verifiedAt)}
          </span>
        )}
      </footer>
    </article>
  );
}

function Section({
  title,
  intro,
  airlines,
}: {
  title: string;
  intro: string;
  airlines: AirlineFee[];
}) {
  if (airlines.length === 0) return null;
  return (
    <section className='mb-12'>
      <h2 className='text-2xl font-black text-gray-900 mb-2'>{title}</h2>
      <p className='text-gray-600 mb-6 leading-relaxed'>{intro}</p>
      {/* 3 colunas quando o total é múltiplo de 3 (evita cartão órfão) */}
      <div
        className={`grid gap-5 md:grid-cols-2 ${
          airlines.length % 3 === 0 ? 'lg:grid-cols-3' : ''
        }`}
      >
        {airlines.map(a => (
          <AirlineCard key={a.id} airline={a} />
        ))}
      </div>
    </section>
  );
}

export default function TarifasAereasPage() {
  const detailed = airlineFees.filter(hasDetails);
  const nacionais = detailed.filter(a => a.scope === 'nacional');
  const internacionais = detailed.filter(a => a.scope === 'internacional');
  const outras = airlineFees.filter(a => !hasDetails(a));

  return (
    <div className='max-w-5xl mx-auto px-4 py-10'>
      <nav className='text-sm text-gray-500 mb-8'>
        <Link href='/' className='hover:text-brand'>
          Início
        </Link>
        <span className='mx-2'>/</span>
        <span className='text-gray-700'>Tarifas aéreas</span>
      </nav>

      <header className='mb-10'>
        <div className='flex items-center gap-3 mb-3'>
          <Plane size={28} className='text-brand' />
          <h1 className='text-3xl font-black text-gray-900'>
            Tarifas aéreas para pranchas
          </h1>
        </div>
        <p className='text-gray-700 leading-relaxed max-w-3xl'>
          Cada companhia trata a prancha de um jeito, e é isso que decide quanto
          você paga. Reunimos aqui como as principais companhias que atendem o
          surfista brasileiro cobram, os limites de tamanho e peso e o link
          direto para a regra oficial de cada uma.
        </p>
      </header>

      {/* Os três modelos de cobrança */}
      <section className='mb-12'>
        <h2 className='text-2xl font-black text-gray-900 mb-6'>
          Como as companhias cobram
        </h2>
        <div className='grid gap-5 md:grid-cols-3'>
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-6'>
            <ShieldCheck size={22} className='text-brand mb-3' />
            <h3 className='font-bold text-gray-900 mb-2'>Dentro da franquia</h3>
            <p className='text-sm text-gray-700 leading-relaxed'>
              A capa conta como uma mala despachada. Se a tarifa já inclui
              bagagem e a capa respeita peso e tamanho, não há custo extra.
              Comum em voos de longa distância.
            </p>
          </div>
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-6'>
            <Scale size={22} className='text-brand mb-3' />
            <h3 className='font-bold text-gray-900 mb-2'>
              Taxa fixa de bagagem especial
            </h3>
            <p className='text-sm text-gray-700 leading-relaxed'>
              A prancha é um item à parte, com valor próprio por trecho, mesmo
              que você tenha franquia sobrando. É o modelo das três grandes
              companhias brasileiras.
            </p>
          </div>
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-6'>
            <Ruler size={22} className='text-brand mb-3' />
            <h3 className='font-bold text-gray-900 mb-2'>
              Excesso por tamanho ou peso
            </h3>
            <p className='text-sm text-gray-700 leading-relaxed'>
              A capa entra na franquia, mas paga adicional se passar do limite
              de centímetros lineares ou de quilos. É onde um longboard ou um
              sarcófago cheio costumam pesar no bolso.
            </p>
          </div>
        </div>
        <p className='text-sm text-gray-600 mt-5 leading-relaxed'>
          Centímetros lineares são a soma de comprimento, largura e altura da
          capa fechada. Uma capa de 200 cm x 60 cm x 15 cm tem 275 cm lineares.
        </p>
      </section>

      <Section
        title='Companhias nacionais'
        intro='Nos voos dentro do Brasil, as três companhias tratam a prancha como item especial, cobrado por trecho.'
        airlines={nacionais}
      />

      <Section
        title='Companhias internacionais'
        intro='Para surf trips fora do país. Os valores são por trecho e costumam ser cobrados em dólar.'
        airlines={internacionais}
      />

      {outras.length > 0 && (
        <section className='mb-12'>
          <h2 className='text-2xl font-black text-gray-900 mb-2'>
            Outras companhias
          </h2>
          <p className='text-gray-600 mb-5 leading-relaxed'>
            Ainda estamos conferindo estas políticas uma a uma. Enquanto isso,
            consulte a regra de bagagem esportiva direto na fonte.
          </p>
          <ul className='grid gap-3 sm:grid-cols-2 md:grid-cols-3'>
            {outras.map(a => (
              <li key={a.id}>
                <a
                  href={a.officialUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center justify-between gap-2 bg-white rounded-md border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 hover:border-brand hover:text-brand-dark transition-colors'
                >
                  {a.name}
                  <ExternalLink size={14} className='shrink-0' />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Como embalar + produto */}
      <section className='mb-12 rounded-lg bg-chumbo text-white p-6 md:p-8'>
        <h2 className='text-2xl font-black mb-4'>
          Antes de despachar a prancha
        </h2>
        <ul className='space-y-3 text-sm text-gray-200 leading-relaxed mb-6 max-w-3xl'>
          <li>
            Avise a companhia com antecedência. Várias aceitam prancha apenas
            sujeita a espaço no porão, e em aviões menores o limite de
            comprimento é mais curto.
          </li>
          <li>
            Tire as quilhas, proteja bico, rabeta e bordas, e preencha os vazios
            da capa com a roupa da viagem. Capa com folga é prancha batendo.
          </li>
          <li>
            Pese a capa fechada em casa. Passar de 23 kg costuma custar mais do
            que a própria tarifa da prancha.
          </li>
          <li>
            Fotografe as pranchas antes de fechar a capa e guarde o comprovante
            de despacho até retirar tudo inteiro na esteira.
          </li>
        </ul>
        <Link
          href='/categoria/capas'
          className='inline-flex items-center gap-2 bg-brand text-white text-sm font-bold px-5 py-3 rounded-md hover:bg-brand-dark transition-colors'
        >
          Ver capas de viagem Pro-Lite
        </Link>
      </section>

      {/* Aviso */}
      <aside className='flex gap-3 rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 leading-relaxed'>
        <Info size={18} className='shrink-0 mt-0.5 text-gray-500' />
        <p>
          As companhias alteram tarifas e regras sem aviso, e o valor final pode
          variar conforme rota, tarifa comprada e canal de compra. Esta página é
          um guia de referência, revisado pela última vez em{' '}
          {formatDate(AIRLINE_FEES_LAST_REVIEW)}, e não substitui a política
          oficial. Confirme sempre com a companhia antes de comprar a passagem.
        </p>
      </aside>
    </div>
  );
}
