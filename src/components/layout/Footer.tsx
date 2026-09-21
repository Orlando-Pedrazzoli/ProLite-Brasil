import Link from 'next/link';
import Image from 'next/image';
import {
  company,
  getFormattedAddress,
  getWhatsAppUrl,
} from '@/lib/config/company';

const abvtex = company.certification.abvtex;

// Medalha genérica (não é o logotipo da ABVTEX) em dourado.
function GoldSealIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 64 64'
      className={className}
      aria-hidden='true'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        <linearGradient id='footerGold' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stopColor='#F9E08B' />
          <stop offset='50%' stopColor='#D4A72C' />
          <stop offset='100%' stopColor='#A87C12' />
        </linearGradient>
      </defs>
      <path d='M20 40 L14 62 L24 56 L30 64 L32 44 Z' fill='#A87C12' />
      <path d='M44 40 L50 62 L40 56 L34 64 L32 44 Z' fill='#A87C12' />
      <circle cx='32' cy='26' r='24' fill='url(#footerGold)' />
      <circle
        cx='32'
        cy='26'
        r='18.5'
        fill='none'
        stroke='#FFF6D5'
        strokeWidth='1.5'
        strokeDasharray='2 2.5'
      />
      <path
        d='M32 13.5l3.8 7.7 8.5 1.2-6.2 6 1.5 8.4L32 32.8l-7.6 4 1.5-8.4-6.2-6 8.5-1.2z'
        fill='#FFF6D5'
      />
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className='bg-chumbo text-gray-300'>
      {/* Newsletter */}
      <div className='bg-brand'>
        <div className='max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6'>
          <p className='text-white font-bold text-sm md:text-base text-center whitespace-nowrap'>
            CADASTRE-SE EM NOSSA NEWSLETTER E RECEBA NOVIDADES EXCLUSIVAS!
          </p>
          <div className='flex w-full max-w-lg'>
            <input
              type='email'
              placeholder='Insira seu e-mail aqui'
              className='flex-1 px-5 py-3 text-sm text-gray-900 bg-white rounded-l-md focus:outline-none min-w-0'
            />
            <button className='px-8 py-3 bg-chumbo text-white text-sm font-bold rounded-r-md hover:bg-chumbo-light transition-colors whitespace-nowrap'>
              CADASTRAR
            </button>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className='max-w-7xl mx-auto px-4 py-10'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8'>
          {/* Sobre Nós */}
          <div>
            <h3 className='text-white font-bold text-sm mb-4 uppercase'>
              Sobre Nós
            </h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/a-empresa'
                  className='text-sm hover:text-brand transition-colors'
                >
                  A Empresa
                </Link>
              </li>
              <li>
                <Link
                  href='/politica-privacidade'
                  className='text-sm hover:text-brand transition-colors'
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href='/termos'
                  className='text-sm hover:text-brand transition-colors'
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <button
                  type='button'
                  data-cookie-preferences
                  className='text-sm text-left hover:text-brand transition-colors'
                >
                  Preferências de Cookies
                </button>
              </li>
              <li>
                <Link
                  href='/contato'
                  className='text-sm hover:text-brand transition-colors'
                >
                  Fale Conosco
                </Link>
              </li>
            </ul>
          </div>

          {/* Dúvidas */}
          <div>
            <h3 className='text-white font-bold text-sm mb-4 uppercase'>
              Dúvidas
            </h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/prazos-entrega'
                  className='text-sm hover:text-brand transition-colors'
                >
                  Prazos de Entrega
                </Link>
              </li>
              <li>
                <Link
                  href='/formas-pagamento'
                  className='text-sm hover:text-brand transition-colors'
                >
                  Formas de Pagamento
                </Link>
              </li>
              <li>
                <Link
                  href='/trocas-devolucoes'
                  className='text-sm hover:text-brand transition-colors'
                >
                  Garantia, Trocas e Devoluções
                </Link>
              </li>
              <li>
                <Link
                  href='/faq'
                  className='text-sm hover:text-brand transition-colors'
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Minha Conta */}
          <div>
            <h3 className='text-white font-bold text-sm mb-4 uppercase'>
              Minha Conta
            </h3>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/login'
                  className='text-sm hover:text-brand transition-colors'
                >
                  Entrar
                </Link>
              </li>
              <li>
                <Link
                  href='/cadastro'
                  className='text-sm hover:text-brand transition-colors'
                >
                  Cadastre-se
                </Link>
              </li>
              <li>
                <Link
                  href='/meus-pedidos'
                  className='text-sm hover:text-brand transition-colors'
                >
                  Meus Pedidos
                </Link>
              </li>
              <li>
                <Link
                  href='/enderecos'
                  className='text-sm hover:text-brand transition-colors'
                >
                  Meus Endereços
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className='text-white font-bold text-sm mb-4 uppercase'>
              Contato
            </h3>
            <ul className='space-y-3'>
              <li className='text-sm flex items-center gap-2'>
                <span>✉</span>
                <a
                  href={`mailto:${company.email}`}
                  className='hover:text-brand transition-colors'
                >
                  {company.email}
                </a>
              </li>
              <li className='text-sm flex items-center gap-2'>
                <span>📱</span>
                <a
                  href={getWhatsAppUrl()}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='hover:text-brand transition-colors'
                >
                  {company.whatsappDisplay} (WhatsApp)
                </a>
              </li>
              <li className='text-sm flex items-center gap-2'>
                <span>☎</span>
                <a
                  href={`tel:+55${company.phone.replace(/\D/g, '')}`}
                  className='hover:text-brand transition-colors'
                >
                  {company.phone}
                </a>
              </li>
              <li className='text-sm flex items-start gap-2'>
                <span className='mt-0.5'>📍</span>
                <span>{getFormattedAddress()}</span>
              </li>
              <li className='text-sm flex items-center gap-2'>
                <span>🕐</span>
                <span>{company.businessHours}</span>
              </li>
              {/* Social Icons */}
              <li className='pt-2'>
                <div className='flex items-center gap-3'>
                  {company.social.instagram && (
                    <a
                      href={company.social.instagram}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='w-9 h-9 rounded-full bg-chumbo-light flex items-center justify-center hover:bg-brand hover:scale-110 transition-all duration-300 group'
                      aria-label='Instagram'
                    >
                      <svg
                        width='16'
                        height='16'
                        viewBox='0 0 24 24'
                        fill='none'
                        className='text-gray-400 group-hover:text-white transition-colors duration-300'
                      >
                        <rect
                          x='2'
                          y='2'
                          width='20'
                          height='20'
                          rx='5'
                          stroke='currentColor'
                          strokeWidth='2'
                        />
                        <circle
                          cx='12'
                          cy='12'
                          r='5'
                          stroke='currentColor'
                          strokeWidth='2'
                        />
                        <circle cx='18' cy='6' r='1.5' fill='currentColor' />
                      </svg>
                    </a>
                  )}
                  {company.social.facebook && (
                    <a
                      href={company.social.facebook}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='w-9 h-9 rounded-full bg-chumbo-light flex items-center justify-center hover:bg-brand hover:scale-110 transition-all duration-300 group'
                      aria-label='Facebook'
                    >
                      <svg
                        width='16'
                        height='16'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                        className='text-gray-400 group-hover:text-white transition-colors duration-300'
                      >
                        <path d='M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z' />
                      </svg>
                    </a>
                  )}
                  <a
                    href={getWhatsAppUrl()}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='w-9 h-9 rounded-full bg-chumbo-light flex items-center justify-center hover:bg-[#25D366] hover:scale-110 transition-all duration-300 group'
                    aria-label='WhatsApp'
                  >
                    <svg
                      width='16'
                      height='16'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                      className='text-gray-400 group-hover:text-white transition-colors duration-300'
                    >
                      <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
                    </svg>
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ═══ SELO DE QUALIDADE — ABVTEX ═══ */}
      <div className='border-t border-white/10 bg-gradient-to-r from-chumbo-dark via-chumbo to-chumbo-dark'>
        <div className='max-w-7xl mx-auto px-4 py-8'>
          <div className='flex flex-col lg:flex-row items-center gap-6 lg:gap-10'>
            <div className='flex items-center gap-4 flex-shrink-0'>
              <GoldSealIcon className='w-16 h-16 md:w-20 md:h-20 drop-shadow-lg' />
              <div>
                <p className='text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A72C]'>
                  Selo de Qualidade
                </p>
                <p className='text-white text-xl md:text-2xl font-black leading-tight'>
                  {abvtex.label}
                </p>
                <p className='text-xs text-gray-400'>
                  Empresa aprovada no {abvtex.program}
                </p>
              </div>
            </div>

            <div className='flex-1 text-center lg:text-left'>
              <p className='text-sm text-gray-300 leading-relaxed'>
                Os produtos {company.name} são fabricados pela{' '}
                <strong className='text-white'>{company.tradeName}</strong>,
                aprovada com o nível máximo do {abvtex.program}: auditorias
                independentes que avaliam conformidade social, ambiental e
                trabalhista na cadeia de moda brasileira.
              </p>
              <ul className='mt-3 flex flex-wrap justify-center lg:justify-start gap-2'>
                {[
                  'Fabricação própria em São Paulo',
                  'Auditoria independente',
                  `Aprovada desde ${abvtex.memberSince}`,
                ].map(item => (
                  <li
                    key={item}
                    className='text-[11px] font-semibold text-[#F9E08B] border border-[#D4A72C]/40 bg-[#D4A72C]/10 rounded-full px-3 py-1'
                  >
                    ✓ {item}
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={abvtex.url}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-[#D4A72C] text-[#F9E08B] text-sm font-bold hover:bg-[#D4A72C] hover:text-chumbo-dark transition-colors'
            >
              Conheça o programa ABVTEX
              <span aria-hidden='true'>→</span>
            </a>
          </div>
        </div>
      </div>

      {/* Payment Cards + Logo + Dev Credit — White Background */}
      <div className='bg-white'>
        <div className='max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-6'>
          {/* Payment Methods */}
          <div className='flex-shrink-0'>
            <Image
              src='/images/cartoes-footer.jpg'
              alt='Formas de pagamento: Amex, Aura, Diners, Discover, Elo, Hipercard, JCB, Visa, Mastercard, Boleto, PIX'
              width={500}
              height={80}
              className='h-16 w-auto object-contain'
            />
          </div>

          {/* Logo + Info — Center */}
          <div className='flex flex-col items-center text-center'>
            <Link
              href='/'
              className='mb-1'
              aria-label='Pro-Lite — página inicial'
            >
              <Image
                src='/images/logo_nav_origin.png'
                alt='Pro-Lite'
                width={5246}
                height={1094}
                sizes='154px'
                className='h-8 w-auto object-contain'
              />
            </Link>
            <p className='text-[10px] text-gray-400 mt-1'>{company.slogan}.</p>
          </div>

          {/* Developer Credit + Admin Access */}
          <div className='text-center md:text-right flex-shrink-0'>
            <p className='text-[10px] text-gray-400 uppercase tracking-wide mb-1'>
              Desenvolvido por
            </p>
            <div className='flex items-center justify-center md:justify-end gap-2'>
              <a
                href='https://pedrazzolidigital.com'
                target='_blank'
                rel='noopener noreferrer'
                className='text-sm font-bold text-brand hover:underline'
              >
                Pedrazzoli Digital
              </a>
              <Link
                href='/admin-login'
                className='text-gray-300 hover:text-brand transition-colors'
                title='Painel Administrativo'
              >
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
                  <path d='M7 11V7a5 5 0 0110 0v4' />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className='bg-gray-950 border-t border-gray-800'>
        <div className='max-w-7xl mx-auto px-4 py-3 text-center'>
          <p className='text-[10px] text-gray-500'>
            © {year} {company.name} — marca da {company.tradeName}. Todos os
            direitos reservados.
          </p>
          <p className='text-[10px] text-gray-600 mt-0.5'>
            {company.legalName} · CNPJ {company.cnpj} · IE {company.ie} ·{' '}
            {getFormattedAddress()}
          </p>
        </div>
      </div>
    </footer>
  );
}
