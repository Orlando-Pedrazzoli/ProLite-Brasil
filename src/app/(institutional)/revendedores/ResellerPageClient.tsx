// 📄 src/app/(institutional)/revendedores/ResellerPageClient.tsx
// "Seja um Revendedor" — landing curta (por que revender Pro-Lite + como
// funciona) e formulário de cadastro do lojista.
//
// Copy (v2): tom profissional, foco no lojista. NÃO promete margem,
// exclusividade territorial, desconto, frete ou pedido mínimo — condições
// comerciais são apresentadas pela equipe após o cadastro. Estrutura:
// hero → benefícios → como funciona → chamada + formulário → encerramento.
//
// • CNPJ com máscara e AUTOPREENCHIMENTO via BrasilAPI (razão social, nome
//   fantasia, endereço, telefone/e-mail quando existirem) — o lojista só
//   confere e completa;
// • CEP com autopreenchimento via ViaCEP (quando o lojista altera o endereço);
// • honeypot invisível (website_url) + validação no cliente espelhando a
//   do servidor (POST /api/resellers);
// • estado de SUCESSO substitui o formulário, com expectativa de resposta
//   (2 dias úteis) e WhatsApp para urgências;
// • ?acesso=invalido (vindo de /revendedor/acesso) mostra aviso de link
//   expirado/revogado.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Store,
  BadgeCheck,
  Waves,
  Handshake,
  ClipboardList,
  Mail,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  MessageCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { company } from '@/lib/config/company';
import { isValidCNPJ, isValidEmail, isValidPhone } from '@/lib/utils/validators';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

const emptyForm = {
  companyName: '',
  tradeName: '',
  cnpj: '',
  stateRegistration: '',
  storeType: 'fisica',
  website: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  contactName: '',
  email: '',
  phone: '',
  message: '',
  website_url: '', // honeypot — humanos nunca veem/preenchem
};

type Form = typeof emptyForm;

const maskCNPJ = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');

const maskCEP = (v: string) =>
  v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10)
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

const inputCls =
  'w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:bg-gray-50';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

const BENEFITS = [
  {
    icon: Waves,
    title: 'Produtos desenvolvidos para quem vive o surf',
    text: 'Capas, leashes, decks, quilhas, parafinas, racks e acessórios para atender às necessidades de surfistas de diferentes níveis.',
  },
  {
    icon: BadgeCheck,
    title: 'Qualidade e confiança',
    text: 'Produtos pensados para acompanhar a rotina dos surfistas, com atenção à funcionalidade, à durabilidade e aos detalhes. Fabricação própria em São Paulo.',
  },
  {
    icon: Handshake,
    title: 'Uma parceria para crescer',
    text: 'Tenha acesso às informações sobre nossa linha de produtos e às condições para revendedores.',
  },
];

const STEPS = [
  { icon: ClipboardList, text: 'Preencha o cadastro com os dados da sua loja' },
  { icon: Mail, text: 'Nossa equipe analisa o cadastro e entra em contato' },
  { icon: FileSpreadsheet, text: 'Aprovado, você recebe acesso à tabela de preços para lojistas' },
];

export default function ResellerPageClient() {
  const searchParams = useSearchParams();
  const accessInvalid = searchParams.get('acesso') === 'invalido';

  const [form, setForm] = useState<Form>(emptyForm);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [cnpjFilled, setCnpjFilled] = useState(false);

  const set = (key: keyof Form, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  // ── Autopreenchimento por CNPJ (BrasilAPI) ──
  useEffect(() => {
    const digits = form.cnpj.replace(/\D/g, '');
    if (digits.length !== 14 || !isValidCNPJ(digits) || cnpjFilled) return;
    let cancelled = false;
    (async () => {
      setLookingUp(true);
      try {
        const res = await fetch(
          `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
        );
        if (!res.ok) return;
        const d = await res.json();
        if (cancelled) return;
        setForm(f => ({
          ...f,
          companyName: f.companyName || d.razao_social || '',
          tradeName: f.tradeName || d.nome_fantasia || '',
          cep: f.cep || maskCEP(String(d.cep || '')),
          street: f.street || [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(' '),
          number: f.number || String(d.numero || ''),
          complement: f.complement || String(d.complemento || ''),
          neighborhood: f.neighborhood || d.bairro || '',
          city: f.city || d.municipio || '',
          state: f.state || d.uf || '',
          phone: f.phone || (d.ddd_telefone_1 ? maskPhone(String(d.ddd_telefone_1)) : ''),
          email: f.email || (d.email ? String(d.email).toLowerCase() : ''),
        }));
        setCnpjFilled(true);
        toast.success('Dados da empresa preenchidos — confira e complete.');
      } catch {
        /* sem bloqueio: o lojista preenche à mão */
      } finally {
        if (!cancelled) setLookingUp(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.cnpj, cnpjFilled]);

  // ── Autopreenchimento por CEP (ViaCEP) ──
  const lookupCep = async (cep: string) => {
    const d = cep.replace(/\D/g, '');
    if (d.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await res.json();
      if (j?.erro) return;
      setForm(f => ({
        ...f,
        street: j.logradouro || f.street,
        neighborhood: j.bairro || f.neighborhood,
        city: j.localidade || f.city,
        state: j.uf || f.state,
      }));
    } catch {
      /* ignorar */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.companyName.trim().length < 3)
      return toast.error('Informe a razão social.');
    if (!isValidCNPJ(form.cnpj)) return toast.error('CNPJ inválido.');
    if (form.city.trim().length < 2 || form.state.length !== 2)
      return toast.error('Informe cidade e estado da loja.');
    if (form.contactName.trim().length < 3)
      return toast.error('Informe o nome do responsável.');
    if (!isValidEmail(form.email)) return toast.error('E-mail inválido.');
    if (!isValidPhone(form.phone))
      return toast.error('Informe o WhatsApp com DDD.');

    setSending(true);
    try {
      const res = await fetch('/api/resellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          tradeName: form.tradeName,
          cnpj: form.cnpj,
          stateRegistration: form.stateRegistration,
          storeType: form.storeType,
          website: form.website,
          address: {
            cep: form.cep,
            street: form.street,
            number: form.number,
            complement: form.complement,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
          },
          contactName: form.contactName,
          email: form.email,
          phone: form.phone,
          message: form.message,
          website_url: form.website_url,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSent(true);
        toast.success('Cadastro enviado!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(
          data.error || 'Não foi possível enviar. Tente novamente ou chame no WhatsApp.',
        );
      }
    } catch {
      toast.error('Falha de conexão. Tente novamente ou chame no WhatsApp.');
    } finally {
      setSending(false);
    }
  };

  const whatsappUrl = `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(
    'Olá! Tenho interesse em revender os produtos Pro-Lite.',
  )}`;

  return (
    <div className='bg-gray-50'>
      {/* ═══ HERO ═══ */}
      <section className='bg-chumbo text-white'>
        <div className='max-w-6xl mx-auto px-4 py-14 md:py-20'>
          <nav className='text-xs text-gray-400 mb-6'>
            <Link href='/' className='hover:text-white'>
              Início
            </Link>
            <span className='mx-2'>/</span>
            <span className='text-gray-200'>Seja um Revendedor</span>
          </nav>
          <p className='text-brand font-bold uppercase tracking-widest text-xs mb-3'>
            Programa de revendedores
          </p>
          <h1 className='text-3xl md:text-5xl font-black leading-tight max-w-3xl'>
            Seja um Revendedor Pro-Lite
          </h1>
          <p className='text-gray-300 mt-4 max-w-2xl text-base md:text-lg'>
            Faça parte de uma marca com tradição no surf e leve produtos de
            qualidade para a sua loja. Cadastre-se para conhecer nossas
            condições comerciais e ampliar seu mix de produtos.
          </p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <a
              href='#cadastro'
              className='inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-6 py-3 rounded-md transition-colors'
            >
              <Store size={18} /> Quero ser revendedor
            </a>
            <a
              href={whatsappUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 border border-white/30 hover:bg-white/10 text-white font-medium px-6 py-3 rounded-md transition-colors'
            >
              <MessageCircle size={18} /> Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <div className='max-w-6xl mx-auto px-4 py-12'>
        {accessInvalid && !sent && (
          <div className='mb-8 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900'>
            <AlertTriangle size={20} className='shrink-0 mt-0.5' />
            <div className='text-sm'>
              <p className='font-semibold'>Link de acesso inválido ou expirado</p>
              <p>
                O link da tabela de preços que você usou não é mais válido. Se
                já é revendedor Pro-Lite, peça um novo link pelo e-mail{' '}
                <a href={`mailto:${company.email}`} className='underline'>
                  {company.email}
                </a>{' '}
                ou pelo WhatsApp. Se ainda não é, cadastre-se abaixo.
              </p>
            </div>
          </div>
        )}

        {/* ═══ BENEFÍCIOS ═══ */}
        <section className='mb-12'>
          <h2 className='text-xl md:text-2xl font-black text-gray-900 mb-5'>
            Sua loja conectada ao universo do surf
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {BENEFITS.map(b => (
              <div key={b.title} className='bg-white rounded-lg p-5 shadow-sm'>
                <div className='w-10 h-10 rounded-md bg-brand-50 text-brand flex items-center justify-center mb-3'>
                  <b.icon size={20} />
                </div>
                <h3 className='font-bold text-gray-900 mb-1'>{b.title}</h3>
                <p className='text-sm text-gray-500 leading-relaxed'>{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ COMO FUNCIONA ═══ */}
        <section className='mb-12'>
          <h2 className='text-xl font-black text-gray-900 mb-4'>Como funciona</h2>
          <ol className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {STEPS.map((s, i) => (
              <li
                key={s.text}
                className='flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm'
              >
                <span className='shrink-0 w-8 h-8 rounded-full bg-chumbo text-white text-sm font-bold flex items-center justify-center'>
                  {i + 1}
                </span>
                <div className='flex items-center gap-2 text-sm text-gray-700 pt-1'>
                  <s.icon size={16} className='text-brand shrink-0' />
                  {s.text}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ═══ CHAMADA + FORMULÁRIO / SUCESSO ═══ */}
        <section id='cadastro' className='scroll-mt-28'>
          {!sent && (
            <div className='mb-6 max-w-3xl'>
              <h2 className='text-2xl md:text-3xl font-black text-gray-900'>
                Quer vender Pro-Lite na sua loja?
              </h2>
              <p className='text-gray-600 mt-2'>
                Preencha o formulário de cadastro. Nossa equipe entrará em
                contato para apresentar os próximos passos para se tornar um
                revendedor.
              </p>
            </div>
          )}
          {sent ? (
            <div className='bg-white rounded-lg shadow-sm p-8 md:p-12 text-center max-w-2xl mx-auto'>
              <CheckCircle2 size={56} className='text-green-500 mx-auto mb-4' />
              <h2 className='text-2xl font-black text-gray-900 mb-2'>
                Cadastro enviado!
              </h2>
              <p className='text-gray-600 mb-6'>
                Recebemos os dados da <strong>{form.tradeName || form.companyName}</strong>.
                Nossa equipe comercial vai analisar o cadastro e entrar em
                contato por e-mail com os próximos passos. Assim que aprovado,
                você recebe o link da tabela de preços para revendedores.
              </p>
              <a
                href={whatsappUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold px-6 py-3 rounded-md transition-colors'
              >
                <MessageCircle size={18} /> Falar com a equipe no WhatsApp
              </a>
            </div>
          ) : (
            <div className='grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8'>
              <form
                onSubmit={handleSubmit}
                className='bg-white rounded-lg shadow-sm p-6 md:p-8 space-y-6'
                noValidate
              >
                <div>
                  <h2 className='text-xl font-black text-gray-900'>
                    Cadastro de revendedor
                  </h2>
                  <p className='text-sm text-gray-500 mt-1'>
                    Digite o CNPJ e preenchemos os dados da empresa para você
                    conferir.
                  </p>
                </div>

                {/* honeypot */}
                <div className='absolute -left-[9999px] opacity-0' aria-hidden='true'>
                  <label htmlFor='website_url'>Não preencha</label>
                  <input
                    id='website_url'
                    name='website_url'
                    tabIndex={-1}
                    autoComplete='off'
                    value={form.website_url}
                    onChange={e => set('website_url', e.target.value)}
                  />
                </div>

                {/* ── Empresa ── */}
                <fieldset className='space-y-4'>
                  <legend className='text-xs font-bold uppercase tracking-widest text-gray-400 mb-2'>
                    Empresa
                  </legend>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label htmlFor='cnpj' className={labelCls}>
                        CNPJ *
                      </label>
                      <div className='relative'>
                        <input
                          id='cnpj'
                          inputMode='numeric'
                          className={inputCls}
                          placeholder='00.000.000/0000-00'
                          value={form.cnpj}
                          onChange={e => {
                            set('cnpj', maskCNPJ(e.target.value));
                            setCnpjFilled(false);
                          }}
                          required
                        />
                        {lookingUp && (
                          <Loader2
                            size={16}
                            className='absolute right-3 top-3 animate-spin text-brand'
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor='stateRegistration' className={labelCls}>
                        Inscrição estadual
                      </label>
                      <input
                        id='stateRegistration'
                        className={inputCls}
                        placeholder='Isento ou número'
                        value={form.stateRegistration}
                        onChange={e => set('stateRegistration', e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor='companyName' className={labelCls}>
                        Razão social *
                      </label>
                      <input
                        id='companyName'
                        className={inputCls}
                        value={form.companyName}
                        onChange={e => set('companyName', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor='tradeName' className={labelCls}>
                        Nome fantasia (nome da loja)
                      </label>
                      <input
                        id='tradeName'
                        className={inputCls}
                        value={form.tradeName}
                        onChange={e => set('tradeName', e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor='storeType' className={labelCls}>
                        Tipo de loja *
                      </label>
                      <select
                        id='storeType'
                        className={inputCls}
                        value={form.storeType}
                        onChange={e => set('storeType', e.target.value)}
                      >
                        <option value='fisica'>Loja física</option>
                        <option value='online'>Loja online</option>
                        <option value='ambas'>Física + online</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor='website' className={labelCls}>
                        Site ou Instagram
                      </label>
                      <input
                        id='website'
                        className={inputCls}
                        placeholder='@sualoja ou www.sualoja.com.br'
                        value={form.website}
                        onChange={e => set('website', e.target.value)}
                      />
                    </div>
                  </div>
                </fieldset>

                {/* ── Endereço ── */}
                <fieldset className='space-y-4'>
                  <legend className='text-xs font-bold uppercase tracking-widest text-gray-400 mb-2'>
                    Endereço da loja
                  </legend>
                  <div className='grid grid-cols-2 md:grid-cols-6 gap-4'>
                    <div className='col-span-2 md:col-span-2'>
                      <label htmlFor='cep' className={labelCls}>
                        CEP
                      </label>
                      <input
                        id='cep'
                        inputMode='numeric'
                        className={inputCls}
                        placeholder='00000-000'
                        value={form.cep}
                        onChange={e => set('cep', maskCEP(e.target.value))}
                        onBlur={e => lookupCep(e.target.value)}
                      />
                    </div>
                    <div className='col-span-2 md:col-span-4'>
                      <label htmlFor='street' className={labelCls}>
                        Rua / Avenida
                      </label>
                      <input
                        id='street'
                        className={inputCls}
                        value={form.street}
                        onChange={e => set('street', e.target.value)}
                      />
                    </div>
                    <div className='col-span-1 md:col-span-1'>
                      <label htmlFor='number' className={labelCls}>
                        Número
                      </label>
                      <input
                        id='number'
                        className={inputCls}
                        value={form.number}
                        onChange={e => set('number', e.target.value)}
                      />
                    </div>
                    <div className='col-span-1 md:col-span-2'>
                      <label htmlFor='complement' className={labelCls}>
                        Complemento
                      </label>
                      <input
                        id='complement'
                        className={inputCls}
                        value={form.complement}
                        onChange={e => set('complement', e.target.value)}
                      />
                    </div>
                    <div className='col-span-2 md:col-span-3'>
                      <label htmlFor='neighborhood' className={labelCls}>
                        Bairro
                      </label>
                      <input
                        id='neighborhood'
                        className={inputCls}
                        value={form.neighborhood}
                        onChange={e => set('neighborhood', e.target.value)}
                      />
                    </div>
                    <div className='col-span-2 md:col-span-4'>
                      <label htmlFor='city' className={labelCls}>
                        Cidade *
                      </label>
                      <input
                        id='city'
                        className={inputCls}
                        value={form.city}
                        onChange={e => set('city', e.target.value)}
                        required
                      />
                    </div>
                    <div className='col-span-2 md:col-span-2'>
                      <label htmlFor='state' className={labelCls}>
                        Estado *
                      </label>
                      <select
                        id='state'
                        className={inputCls}
                        value={form.state}
                        onChange={e => set('state', e.target.value)}
                        required
                      >
                        <option value=''>UF</option>
                        {UFS.map(uf => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>

                {/* ── Contato ── */}
                <fieldset className='space-y-4'>
                  <legend className='text-xs font-bold uppercase tracking-widest text-gray-400 mb-2'>
                    Responsável pelo contato
                  </legend>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='md:col-span-2'>
                      <label htmlFor='contactName' className={labelCls}>
                        Nome completo *
                      </label>
                      <input
                        id='contactName'
                        className={inputCls}
                        value={form.contactName}
                        onChange={e => set('contactName', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor='email' className={labelCls}>
                        E-mail *
                      </label>
                      <input
                        id='email'
                        type='email'
                        className={inputCls}
                        placeholder='Para onde enviamos a tabela de preços'
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor='phone' className={labelCls}>
                        WhatsApp *
                      </label>
                      <input
                        id='phone'
                        inputMode='tel'
                        className={inputCls}
                        placeholder='(11) 99999-9999'
                        value={form.phone}
                        onChange={e => set('phone', maskPhone(e.target.value))}
                        required
                      />
                    </div>
                    <div className='md:col-span-2'>
                      <label htmlFor='message' className={labelCls}>
                        Conte um pouco sobre a sua loja (opcional)
                      </label>
                      <textarea
                        id='message'
                        rows={3}
                        className={inputCls}
                        placeholder='Há quanto tempo existe, que marcas já trabalha, volume estimado…'
                        value={form.message}
                        onChange={e => set('message', e.target.value)}
                        maxLength={2000}
                      />
                    </div>
                  </div>
                </fieldset>

                <div className='flex flex-col sm:flex-row sm:items-center gap-3 pt-2'>
                  <button
                    type='submit'
                    disabled={sending}
                    className='inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-bold px-6 py-3 rounded-md transition-colors'
                  >
                    {sending ? (
                      <Loader2 size={18} className='animate-spin' />
                    ) : (
                      <Send size={18} />
                    )}
                    {sending ? 'Enviando…' : 'Quero ser revendedor'}
                  </button>
                  <p className='text-xs text-gray-400'>
                    Ao enviar, você concorda com a nossa{' '}
                    <Link href='/politica-privacidade' className='underline hover:text-brand'>
                      política de privacidade
                    </Link>
                    . Venda exclusiva para pessoa jurídica.
                  </p>
                </div>
              </form>

              {/* ── Lateral ── */}
              <aside className='space-y-4'>
                <div className='bg-white rounded-lg shadow-sm p-6'>
                  <h3 className='font-bold text-gray-900 mb-3'>
                    Já é revendedor?
                  </h3>
                  <p className='text-sm text-gray-500 leading-relaxed'>
                    O acesso à tabela de preços é feito pelo link que enviamos
                    por e-mail na aprovação. Perdeu o link? Peça um novo em{' '}
                    <a href={`mailto:${company.email}`} className='text-brand underline'>
                      {company.email}
                    </a>
                    .
                  </p>
                </div>
                <div className='bg-white rounded-lg shadow-sm p-6'>
                  <h3 className='font-bold text-gray-900 mb-3'>
                    Atendimento comercial
                  </h3>
                  <ul className='text-sm text-gray-600 space-y-2'>
                    <li>
                      <a href={whatsappUrl} target='_blank' rel='noopener noreferrer' className='hover:text-brand'>
                        WhatsApp {company.whatsappDisplay}
                      </a>
                    </li>
                    <li>
                      <a href={`mailto:${company.email}`} className='hover:text-brand'>
                        {company.email}
                      </a>
                    </li>
                    <li className='text-gray-400'>{company.businessHours}</li>
                  </ul>
                </div>
                <div className='bg-brand-50 border border-brand-100 rounded-lg p-6'>
                  <p className='text-sm text-brand-darker leading-relaxed'>
                    <strong>Pro-Lite</strong> é uma marca da {company.tradeName}{' '}
                    ({company.address.city} - {company.address.state}), com{' '}
                    {company.certification.abvtex.label}.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </section>
      </div>

      {/* ═══ ENCERRAMENTO ═══ */}
      <section className='bg-chumbo text-white'>
        <div className='max-w-6xl mx-auto px-4 py-12 md:py-16 text-center'>
          <p className='text-2xl md:text-3xl font-black'>
            Pro-Lite. Há 40 anos no universo do surf.
          </p>
          <p className='text-gray-300 mt-3 max-w-2xl mx-auto'>
            Equipamentos e acessórios desenvolvidos para acompanhar cada
            sessão, da preparação ao retorno da água.
          </p>
        </div>
      </section>
    </div>
  );
}
