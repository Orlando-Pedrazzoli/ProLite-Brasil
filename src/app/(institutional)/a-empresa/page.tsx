import { Metadata } from 'next';
import Link from 'next/link';
import {
  company,
  getFormattedAddress,
  getWhatsAppUrl,
} from '@/lib/config/company';

const abvtex = company.certification.abvtex;

export const metadata: Metadata = {
  title: 'A Empresa',
  description:
    'Conheça a Pro-Lite: marca brasileira registrada em 1984, hoje da Mãos Acessórios, com fabricação própria em São Paulo e Selo Ouro ABVTEX.',
};

export default function AEmpresaPage() {
  return (
    <div className='max-w-4xl mx-auto px-4 py-10'>
      {/* Breadcrumb */}
      <nav className='text-sm text-gray-500 mb-8'>
        <Link href='/' className='hover:text-brand'>
          Início
        </Link>
        <span className='mx-2'>/</span>
        <span className='text-gray-700'>A Empresa</span>
      </nav>

      {/* Title */}
      <h1 className='text-3xl font-black text-gray-900 mb-8'>A Empresa</h1>

      {/* Content */}
      <div className='prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed'>
        <p className='text-lg font-medium text-gray-900'>
          Há 40 anos a Pro-Lite projeta e constrói equipamentos de surf no
          Brasil. Registrada em 1984, é uma marca 100% brasileira e
          independente, com produtos desenvolvidos e fabricados aqui.
        </p>

        <p>
          Hoje a Pro-Lite pertence à <strong>{company.tradeName}</strong>,
          empresa paulistana fundada em 2000 que une confecção, fabricação e
          comércio de acessórios. É na sede da empresa, no Tatuapé, em São
          Paulo, que os produtos ganham forma — com mão de obra especializada em
          costura de capas, mochilas e artigos esportivos em nylon e outros
          materiais técnicos.
        </p>

        <p>
          Capas e leashes são os pilares da marca, ao lado de decks, quilhas,
          parafinas e acessórios pensados para o dia a dia de quem surfa.
        </p>

        {/* Selo ABVTEX em destaque */}
        <div className='not-prose rounded-xl border border-[#D4A72C]/40 bg-gradient-to-br from-[#FFF8E1] to-white p-6 my-8'>
          <p className='text-[11px] font-bold uppercase tracking-[0.2em] text-[#A87C12] mb-1'>
            Selo de Qualidade
          </p>
          <h2 className='text-2xl font-black text-gray-900 mb-3'>
            {abvtex.label}
          </h2>
          <p className='text-sm text-gray-700 leading-relaxed'>
            A {company.tradeName} é aprovada com <strong>Selo Ouro</strong>, o
            nível máximo do {abvtex.program}, e consta na relação de
            fornecedores aprovados desde {abvtex.memberSince}. O programa usa
            auditorias independentes para avaliar aspectos sociais, ambientais,
            legais e trabalhistas de quem fornece para o varejo de moda
            brasileiro.
          </p>
          <a
            href={abvtex.url}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-block mt-4 text-sm font-bold text-[#A87C12] hover:underline'
          >
            Conheça o programa ABVTEX →
          </a>
        </div>

        <h2 className='text-xl font-bold text-gray-900 mt-8'>Nossa Missão</h2>

        <p>
          Levar aos surfistas de todo o Brasil equipamentos resistentes, bem
          acabados e feitos para durar, com transparência, credibilidade e apoio
          próximo a cada cliente.
        </p>

        <h2 className='text-xl font-bold text-gray-900 mt-8'>
          Nosso Compromisso
        </h2>

        <p>
          Trabalhamos respeitando o Código de Defesa do Consumidor e vendemos
          sempre com nota fiscal e garantia. Nosso objetivo é que cada compra
          seja simples, segura e que o produto chegue até você o mais rápido
          possível.
        </p>

        <h2 className='text-xl font-bold text-gray-900 mt-8'>Entrega Segura</h2>

        <p>
          Enviamos para todo o Brasil pelas principais transportadoras, com
          frete segurado e código de rastreio. Os pedidos são despachados após a
          confirmação do pagamento.
        </p>

        <h2 className='text-xl font-bold text-gray-900 mt-8'>
          Atendimento e Retirada
        </h2>

        <p>
          Fale com a gente pelo e-mail{' '}
          <a
            href={`mailto:${company.email}`}
            className='text-brand hover:underline'
          >
            {company.email}
          </a>
          , pelo WhatsApp{' '}
          <a
            href={getWhatsAppUrl()}
            target='_blank'
            rel='noopener noreferrer'
            className='text-brand hover:underline'
          >
            {company.whatsappDisplay}
          </a>{' '}
          ou pelo telefone {company.phone}. Se preferir, escolha a retirada no
          checkout e busque seu pedido sem custo de frete em{' '}
          <strong>{getFormattedAddress()}</strong>.
        </p>

        <div className='bg-gray-50 rounded-lg p-6 mt-6'>
          <p className='text-sm text-gray-600 mb-2'>
            <strong>Horário de Atendimento:</strong>
          </p>
          {company.businessHours.split('|').map(line => (
            <p key={line} className='text-sm text-gray-600'>
              {line.trim()}
            </p>
          ))}
        </div>

        <div className='bg-gray-50 rounded-lg p-6'>
          <p className='text-sm text-gray-600'>
            <strong>Dados da empresa</strong>
            <br />
            {company.legalName}
            <br />
            Nome fantasia: {company.tradeName}
            <br />
            CNPJ {company.cnpj} · IE {company.ie}
            <br />
            {getFormattedAddress()}
          </p>
        </div>

        <p className='text-xl font-bold text-brand mt-8'>
          Bem-vindo ao mundo Pro-Lite! 🏄
        </p>
      </div>
    </div>
  );
}
