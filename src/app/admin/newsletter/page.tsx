// 📄 src/app/admin/newsletter/page.tsx
// NEWSLETTER — inscritos do site (modal + barra do rodapé) para e-mail
// marketing.
//   • cartões de resumo (ativos, cancelados, últimos 30 dias);
//   • abas Ativos / Cancelados / Todos, filtro por origem e busca;
//   • "Exportar CSV" (só ativos ou tudo) pronto para importar em
//     Resend / Mailchimp / Brevo; "Copiar e-mails" (lista separada por
//     vírgula, para colar em BCC);
//   • ações por linha: cancelar/reativar e excluir (pedido LGPD).
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Mail,
  Search,
  Download,
  Copy,
  UserX,
  UserCheck,
  Trash2,
  Users,
  CalendarDays,
  Cake,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';

type Status = 'active' | 'unsubscribed';

interface Subscriber {
  _id: string;
  email: string;
  name?: string;
  birthday?: string | null;
  source: string;
  couponCode?: string;
  status: Status;
  createdAt: string;
}

const SOURCE_LABEL: Record<string, string> = {
  newsletter_modal: 'Pop-up',
  footer: 'Rodapé',
  checkout: 'Checkout',
  manual: 'Manual',
};

const TABS: { key: Status | 'all'; label: string }[] = [
  { key: 'active', label: 'Ativos' },
  { key: 'unsubscribed', label: 'Cancelados' },
  { key: 'all', label: 'Todos' },
];

const fmtDate = (v?: string | null, withTime = false) =>
  v
    ? new Date(v).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: withTime ? '2-digit' : 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
        timeZone: withTime ? undefined : 'UTC', // aniversário é só data
      })
    : '—';

export default function AdminNewsletterPage() {
  const [tab, setTab] = useState<Status | 'all'>('active');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [list, setList] = useState<Subscriber[]>([]);
  const [summary, setSummary] = useState({ active: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== 'all') params.set('status', tab);
      if (source) params.set('source', source);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/newsletter?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setList(data.subscribers);
        setSummary(data.summary);
      } else toast.error(data.error || 'Erro ao carregar inscritos');
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [tab, source, search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const last30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return list.filter(s => new Date(s.createdAt).getTime() >= cutoff).length;
  }, [list]);

  const setStatus = async (s: Subscriber, status: Status) => {
    setActing(s._id);
    try {
      const res = await fetch(`/api/newsletter/${s._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Erro ao atualizar');
        return;
      }
      toast.success(
        status === 'active' ? 'Inscrição reativada' : 'Inscrição cancelada',
      );
      fetchList();
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setActing(null);
    }
  };

  const remove = async (s: Subscriber) => {
    if (!confirm(`Excluir ${s.email} definitivamente da lista?`)) return;
    setActing(s._id);
    try {
      const res = await fetch(`/api/newsletter/${s._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Erro ao excluir');
        return;
      }
      toast.success('Inscrito excluído');
      fetchList();
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setActing(null);
    }
  };

  const copyEmails = async () => {
    const emails = list.filter(s => s.status === 'active').map(s => s.email);
    if (!emails.length) {
      toast.error('Nenhum e-mail ativo na lista atual');
      return;
    }
    try {
      await navigator.clipboard.writeText(emails.join(', '));
      toast.success(
        `${emails.length} e-mail${emails.length > 1 ? 's' : ''} copiado${emails.length > 1 ? 's' : ''}`,
      );
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const exportHref = `/api/newsletter/export?status=${tab === 'all' ? 'all' : tab}`;

  return (
    <div>
      {/* Header */}
      <div className='mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Mail className='text-brand' size={24} />
          <h1 className='text-2xl font-bold'>Newsletter</h1>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' onClick={copyEmails}>
            <Copy size={16} className='mr-1' /> Copiar e-mails
          </Button>
          <a href={exportHref} download>
            <Button>
              <Download size={16} className='mr-1' />
              Exportar CSV (
              {tab === 'all'
                ? 'todos'
                : tab === 'active'
                  ? 'ativos'
                  : 'cancelados'}
              )
            </Button>
          </a>
        </div>
      </div>

      {/* Resumo */}
      <div className='mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3'>
        <Stat
          icon={Users}
          label='Inscritos ativos'
          value={summary.active}
          tone='green'
        />
        <Stat
          icon={UserX}
          label='Cancelados'
          value={summary.unsubscribed}
          tone='gray'
        />
        <Stat
          icon={CalendarDays}
          label='Novos nos últimos 30 dias (lista atual)'
          value={last30}
          tone='brand'
        />
      </div>

      {/* Abas + filtros */}
      <div className='mb-4 flex flex-col md:flex-row md:items-center gap-3'>
        <div className='flex rounded-lg border border-gray-200 bg-white p-1 text-sm'>
          {TABS.map(t => {
            const n =
              t.key === 'all'
                ? summary.active + summary.unsubscribed
                : summary[t.key];
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-chumbo text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t.label}
                <span
                  className={`ml-1.5 text-xs ${tab === t.key ? 'text-gray-300' : 'text-gray-400'}`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
        <select
          value={source}
          onChange={e => setSource(e.target.value)}
          className='rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none'
        >
          <option value=''>Todas as origens</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 md:max-w-sm md:flex-1'>
          <Search size={16} className='text-gray-400' />
          <input
            type='text'
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Buscar por e-mail, nome ou cupom'
            className='w-full text-sm outline-none'
          />
        </div>
      </div>

      {/* Tabela */}
      <div className='overflow-x-auto rounded-lg border border-gray-200 bg-white'>
        <table className='w-full text-sm'>
          <thead className='border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500'>
            <tr>
              <th className='px-4 py-3'>E-mail</th>
              <th className='px-4 py-3'>Nome</th>
              <th className='px-4 py-3'>Aniversário</th>
              <th className='px-4 py-3'>Origem</th>
              <th className='px-4 py-3'>Cupom</th>
              <th className='px-4 py-3'>Inscrito em</th>
              <th className='px-4 py-3'>Status</th>
              <th className='px-4 py-3 text-right'>Ações</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {loading ? (
              <tr>
                <td colSpan={8} className='px-4 py-8 text-center text-gray-400'>
                  Carregando...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={8} className='px-4 py-8 text-center text-gray-400'>
                  Nenhum inscrito encontrado
                </td>
              </tr>
            ) : (
              list.map(s => (
                <tr key={s._id} className='hover:bg-gray-50'>
                  <td className='px-4 py-3 font-medium text-gray-900'>
                    <a href={`mailto:${s.email}`} className='hover:text-brand'>
                      {s.email}
                    </a>
                  </td>
                  <td className='px-4 py-3 text-gray-600'>{s.name || '—'}</td>
                  <td className='px-4 py-3 text-gray-600 whitespace-nowrap'>
                    {s.birthday ? (
                      <span className='inline-flex items-center gap-1'>
                        <Cake size={12} className='text-gray-400' />{' '}
                        {fmtDate(s.birthday)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className='px-4 py-3 text-gray-600'>
                    {SOURCE_LABEL[s.source] || s.source}
                  </td>
                  <td className='px-4 py-3 font-mono text-xs text-gray-500'>
                    {s.couponCode || '—'}
                  </td>
                  <td className='px-4 py-3 text-gray-500 whitespace-nowrap'>
                    {fmtDate(s.createdAt, true)}
                  </td>
                  <td className='px-4 py-3'>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {s.status === 'active' ? 'Ativo' : 'Cancelado'}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex justify-end gap-1'>
                      {s.status === 'active' ? (
                        <button
                          onClick={() => setStatus(s, 'unsubscribed')}
                          disabled={acting === s._id}
                          className='p-1.5 text-gray-400 hover:text-amber-600 disabled:opacity-50'
                          title='Cancelar inscrição'
                        >
                          <UserX size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setStatus(s, 'active')}
                          disabled={acting === s._id}
                          className='p-1.5 text-gray-400 hover:text-green-600 disabled:opacity-50'
                          title='Reativar inscrição'
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => remove(s)}
                        disabled={acting === s._id}
                        className='p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50'
                        title='Excluir'
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className='mt-3 text-xs text-gray-400'>
        O CSV sai com as colunas email, first_name, last_name, birthday, source,
        coupon, status e subscribed_at — formato aceite na importação de
        contatos do Resend, Mailchimp e Brevo. Só envie campanhas para inscritos{' '}
        <strong>ativos</strong>.
      </p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: 'green' | 'gray' | 'brand';
}) {
  const tones = {
    green: 'bg-green-50 text-green-700',
    gray: 'bg-gray-100 text-gray-600',
    brand: 'bg-brand-50 text-brand-darker',
  };
  return (
    <div className='flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4'>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-md ${tones[tone]}`}
      >
        <Icon size={20} />
      </div>
      <div>
        <p className='text-2xl font-black text-gray-900 leading-none'>
          {value}
        </p>
        <p className='text-xs text-gray-500 mt-1'>{label}</p>
      </div>
    </div>
  );
}
