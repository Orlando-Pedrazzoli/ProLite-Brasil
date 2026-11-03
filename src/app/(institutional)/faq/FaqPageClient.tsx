// src/app/(institutional)/faq/FaqPageClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ShoppingCart,
  Truck,
  CreditCard,
  RotateCcw,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { company } from '@/lib/config/company';
import { faqData, type FAQItem, type FAQIcon } from '@/lib/content/faq';

const FAQ_ICONS: Record<FAQIcon, React.ReactNode> = {
  cart: <ShoppingCart size={20} className='text-brand' />,
  truck: <Truck size={20} className='text-brand' />,
  'credit-card': <CreditCard size={20} className='text-brand' />,
  rotate: <RotateCcw size={20} className='text-brand' />,
  shield: <Shield size={20} className='text-brand' />,
  help: <HelpCircle size={20} className='text-brand' />,
};

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className='border-b border-gray-100 last:border-0'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center justify-between w-full py-4 text-left gap-4 group'
      >
        <span
          className={`text-sm font-medium transition-colors ${isOpen ? 'text-brand' : 'text-gray-900 group-hover:text-brand'}`}
        >
          {item.question}
        </span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : ''}`}
        />
      </button>
      {isOpen && (
        <div className='pb-4 pr-8'>
          <p className='text-sm text-gray-600 leading-relaxed'>{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className='max-w-4xl mx-auto px-4 py-10'>
      <nav className='text-sm text-gray-500 mb-8'>
        <Link href='/' className='hover:text-brand'>
          Início
        </Link>
        <span className='mx-2'>/</span>
        <span className='text-gray-700'>FAQ</span>
      </nav>

      <h1 className='text-3xl font-black text-gray-900 mb-2'>
        Perguntas Frequentes
      </h1>
      <p className='text-gray-500 mb-8'>
        Encontre respostas rápidas para as dúvidas mais comuns sobre a Pro-Lite.
      </p>

      <div className='space-y-6'>
        {faqData.map(category => (
          <div
            key={category.title}
            className='bg-white rounded-lg shadow-sm overflow-hidden'
          >
            <div className='flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-200'>
              {FAQ_ICONS[category.icon]}
              <h2 className='text-base font-bold text-gray-900'>
                {category.title}
              </h2>
            </div>
            <div className='px-6'>
              {category.items.map((item, index) => (
                <FAQAccordion key={index} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Still have questions */}
      <div className='bg-gray-50 rounded-lg p-8 mt-8 text-center'>
        <h3 className='text-lg font-bold text-gray-900 mb-2'>
          Não encontrou o que procurava?
        </h3>
        <p className='text-sm text-gray-500 mb-4'>
          Nossa equipe está pronta para ajudar você!
        </p>
        <div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
          <a
            href={`https://wa.me/${company.whatsapp}`}
            target='_blank'
            rel='noopener noreferrer'
            className='px-6 py-2.5 bg-[#25D366] text-white font-bold text-sm rounded-md hover:bg-[#20bd5a] transition-colors inline-flex items-center gap-2'
          >
            💬 WhatsApp
          </a>
          <a
            href={`mailto:${company.email}`}
            className='px-6 py-2.5 bg-brand text-white font-bold text-sm rounded-md hover:bg-brand-dark transition-colors inline-flex items-center gap-2'
          >
            ✉ Enviar E-mail
          </a>
        </div>
      </div>
    </div>
  );
}
