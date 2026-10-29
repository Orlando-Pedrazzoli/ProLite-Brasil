// 📄 src/app/admin/revendedores/page.tsx
// REVENDEDORES — painel do Maurício para aprovar/reprovar lojistas.
//
// • Abas por status (Pendentes / Aprovados / Reprovados / Todos) com
//   contadores; busca por nome, CNPJ, e-mail ou cidade;
// • Clicar na linha abre o detalhe (dados da empresa, contato, mensagem,
//   anotações internas) com as ações:
//     Aprovar        → gera o link e envia a tabela de preços por e-mail
//     Reprovar       → pede motivo (opcional) e avisa o lojista
//     Reenviar acesso→ novo link por e-mail (aprovados)
//     Revogar acesso → corta o acesso à tabela, mantém aprovado
//     Excluir        → apaga a candidatura (lojista pode cadastrar de novo)
// • ?id=<id> (link do e-mail de notificação) abre o detalhe diretamente.
'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Store,
  Search,
  CheckCircle2,
  XCircle,
  Mail,
  ShieldOff,
  Trash2,
  ExternalLink,
  Clock,
  Loader2,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { formatCNPJ, formatPhone } from '@/lib/utils/validators';

type Status = 'pending' | 'approved' | 'rejected';

interface Reseller {
  _id: string;
  companyName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration?: string;
  storeType: 'fisica' | 'online' | 'ambas';
  website?: string;
  address: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  contactName: string;
  email: string;
  phone: string;
  message?: string;
  status: Status;
  adminNotes?: string;
  rejectionReason?: string;
  reviewedAt?: string | null;
  accessTokenCreatedAt?: string | null;
  lastAccessAt?: string | null;
  accessCount: number;
  createdAt: string;
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Reprovado',
};
const STATUS_CLS: Record<Status, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};
const STORE_TYPE_LABEL = {
  fisica: 'Loja física',
  online: 'Loja online',
  ambas: 'Física + online',
};

const fmtDate = (v?: string | null) =>
  v
    ? new Date(v).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const TABS: { key: Status | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'approved', label: 'Aprovados' },
  { key: 'rejected', label: 'Reprovados' },
  { key: 'all', label: 'Todos' },
];

// useSearchParams exige Suspense no build de produção
export default function AdminRevendedoresPage() {
  return (
    <Suspense>
      <AdminRevendedoresInner />
    </Suspense>
  );
}

function AdminRevendedoresInner() {
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get('id');

  const [tab, setTab] = useState<Status | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [list, setList] = useState<Reseller[]>([]);
  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Reseller | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [notes, setNotes] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== 'all') params.set('status', tab);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/resellers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setList(data.resellers);
        setSummary(data.summary);
      } else toast.error(data.error || 'Erro ao carregar revendedores');
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Deep-link do e-mail: abre o detalhe assim que a lista carregar
  useEffect(() => {
    if (!deepLinkId || selected) return;
    const found = list.find(r => r._id === deepLinkId);
    if (found) openDetail(found);
    else if (!loading && tab !== 'all') setTab('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkId, list, loading]);

  const openDetail = (r: Reseller) => {
    setSelected(r);
    setNotes(r.adminNotes || '');
  };

  const patch = async (
    r: Reseller,
    body: Record<string, unknown>,
    okMsg: string,
  ) => {
    setActing(String(body.action));
    try {
      const res = await fetch(`/api/resellers/${r._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Erro ao atualizar');
        return false;
      }
      if (data.emailSent === false)
        toast.error(
          'Ação gravada, mas o e-mail NÃO foi enviado. Use "Reenviar acesso".',
          { duration: 6000 },
        );
      else toast.success(okMsg);
      setSelected(data.reseller);
      setNotes(data.reseller.adminNotes || '');
      fetchList();
      return true;
    } catch {
      toast.error('Erro de conexão');
      return false;
    } finally {
      setActing(null);
    }
  };

  const approve = (r: Reseller) => {
    if (
      !confirm(
        `Aprovar ${r.tradeName} e enviar a tabela de preços para ${r.email}?`,
      )
    )
      return;
    patch(
      r,
      { action: 'approve' },
      'Aprovado! Tabela de preços enviada por e-mail.',
    );
  };

  const confirmReject = async () => {
    if (!selected) return;
    const ok = await patch(
      selected,
      { action: 'reject', reason: rejectReason },
      'Reprovado. Lojista avisado por e-mail.',
    );
    if (ok) {
      setRejectOpen(false);
      setRejectReason('');
    }
  };

  const resend = (r: Reseller) => {
    if (
      !confirm(
        `Gerar um novo link e reenviar a tabela para ${r.email}? O link anterior deixa de funcionar.`,
      )
    )
      return;
    patch(r, { action: 'resend' }, 'Novo link enviado por e-mail.');
  };

  const revoke = (r: Reseller) => {
    if (!confirm(`Revogar o acesso de ${r.tradeName} à tabela de preços?`))
      return;
    patch(r, { action: 'revoke' }, 'Acesso revogado.');
  };

  const saveNotes = (r: Reseller) =>
    patch(r, { action: 'notes', notes }, 'Anotações guardadas.');

  const remove = async (r: Reseller) => {
    if (
      !confirm(
        `Excluir a candidatura de ${r.tradeName}? O lojista poderá cadastrar-se novamente.`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/resellers/${r._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Erro ao excluir');
        return;
      }
      toast.success('Candidatura excluída');
      setSelected(null);
      fetchList();
    } catch {
      toast.error('Erro de conexão');
    }
  };

  const addressLine = (r: Reseller) => {
    const a = r.address || {};
    if (!a.street) return [a.city, a.state].filter(Boolean).join(' - ') || '—';
    return `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ''} · ${a.neighborhood} · ${a.city} - ${a.state} · CEP ${a.cep}`;
  };

  return (
    <div>
      {/* Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Store className='text-brand' size={24} />
          <h1 className='text-2xl font-bold'>Revendedores</h1>
          {summary.pending > 0 && (
            <span className='ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700'>
              {summary.pending} pendente{summary.pending > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <a
          href='/revendedores'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand'
        >
          <ExternalLink size={14} /> Ver página pública
        </a>
      </div>

      {/* Abas + busca */}
      <div className='mb-4 flex flex-col md:flex-row md:items-center gap-3'>
        <div className='flex rounded-lg border border-gray-200 bg-white p-1 text-sm'>
          {TABS.map(t => {
            const n =
              t.key === 'all'
                ? summary.pending + summary.approved + summary.rejected
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
        <div className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 md:max-w-sm md:flex-1'>
          <Search size={16} className='text-gray-400' />
          <input
            type='text'
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Buscar por loja, CNPJ, e-mail ou cidade'
            className='w-full text-sm outline-none'
          />
        </div>
      </div>

      {/* Tabela */}
      <div className='overflow-x-auto rounded-lg border border-gray-200 bg-white'>
        <table className='w-full text-sm'>
          <thead className='border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500'>
            <tr>
              <th className='px-4 py-3'>Loja</th>
              <th className='px-4 py-3'>CNPJ</th>
              <th className='px-4 py-3'>Cidade</th>
              <th className='px-4 py-3'>Contato</th>
              <th className='px-4 py-3'>Recebido</th>
              <th className='px-4 py-3'>Status</th>
              <th className='px-4 py-3 text-right'>Ações</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {loading ? (
              <tr>
                <td colSpan={7} className='px-4 py-8 text-center text-gray-400'>
                  Carregando...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={7} className='px-4 py-8 text-center text-gray-400'>
                  Nenhum revendedor{' '}
                  {tab === 'pending' ? 'pendente' : 'encontrado'}
                </td>
              </tr>
            ) : (
              list.map(r => (
                <tr
                  key={r._id}
                  className='hover:bg-gray-50 cursor-pointer'
                  onClick={() => openDetail(r)}
                >
                  <td className='px-4 py-3'>
                    <p className='font-semibold text-gray-900'>{r.tradeName}</p>
                    <p className='text-xs text-gray-400'>{r.companyName}</p>
                  </td>
                  <td className='px-4 py-3 font-mono text-xs text-gray-600'>
                    {formatCNPJ(r.cnpj)}
                  </td>
                  <td className='px-4 py-3 text-gray-600'>
                    {r.address?.city} - {r.address?.state}
                  </td>
                  <td className='px-4 py-3'>
                    <p className='text-gray-800'>{r.contactName}</p>
                    <p className='text-xs text-gray-400'>{r.email}</p>
                  </td>
                  <td className='px-4 py-3 text-gray-500 whitespace-nowrap'>
                    {fmtDate(r.createdAt)}
                  </td>
                  <td className='px-4 py-3'>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className='px-4 py-3' onClick={e => e.stopPropagation()}>
                    <div className='flex justify-end gap-1'>
                      <button
                        onClick={() => openDetail(r)}
                        className='p-1.5 text-gray-400 hover:text-brand'
                        title='Ver detalhes'
                      >
                        <Eye size={16} />
                      </button>
                      {r.status !== 'approved' && (
                        <button
                          onClick={() => approve(r)}
                          className='p-1.5 text-gray-400 hover:text-green-600'
                          title='Aprovar e enviar tabela'
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      {r.status !== 'rejected' && (
                        <button
                          onClick={() => {
                            openDetail(r);
                            setRejectOpen(true);
                          }}
                          className='p-1.5 text-gray-400 hover:text-red-500'
                          title='Reprovar'
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ DETALHE ═══ */}
      <Modal
        isOpen={!!selected && !rejectOpen}
        onClose={() => setSelected(null)}
        title={selected ? selected.tradeName : ''}
      >
        {selected && (
          <div className='space-y-5 text-sm'>
            <div className='flex items-center justify-between'>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[selected.status]}`}
              >
                {STATUS_LABEL[selected.status]}
              </span>
              <span className='text-xs text-gray-400 flex items-center gap-1'>
                <Clock size={12} /> recebido {fmtDate(selected.createdAt)}
              </span>
            </div>

            <dl className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2'>
              <Row k='Razão social' v={selected.companyName} />
              <Row k='CNPJ' v={formatCNPJ(selected.cnpj)} mono />
              <Row k='Inscr. estadual' v={selected.stateRegistration || '—'} />
              <Row k='Tipo de loja' v={STORE_TYPE_LABEL[selected.storeType]} />
              <Row k='Site / Instagram' v={selected.website || '—'} />
              <Row k='Endereço' v={addressLine(selected)} full />
              <Row k='Responsável' v={selected.contactName} />
              <Row
                k='E-mail'
                v={
                  <a
                    href={`mailto:${selected.email}`}
                    className='text-brand hover:underline'
                  >
                    {selected.email}
                  </a>
                }
              />
              <Row
                k='WhatsApp'
                v={
                  <a
                    href={`https://wa.me/55${selected.phone}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-brand hover:underline'
                  >
                    {formatPhone(selected.phone)}
                  </a>
                }
              />
            </dl>

            {selected.message && (
              <div className='rounded-lg bg-gray-50 border border-gray-200 p-3'>
                <p className='text-xs text-gray-400 mb-1'>
                  Mensagem do lojista
                </p>
                <p className='whitespace-pre-wrap text-gray-700'>
                  {selected.message}
                </p>
              </div>
            )}

            {selected.status === 'approved' && (
              <div className='rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-800 space-y-0.5'>
                <p>Aprovado em {fmtDate(selected.reviewedAt)}</p>
                <p>
                  Link de acesso:{' '}
                  {selected.accessTokenCreatedAt
                    ? `enviado ${fmtDate(selected.accessTokenCreatedAt)}`
                    : 'revogado'}
                  {' · '}
                  {selected.accessCount} acesso
                  {selected.accessCount === 1 ? '' : 's'} à tabela
                  {selected.lastAccessAt
                    ? ` (último ${fmtDate(selected.lastAccessAt)})`
                    : ''}
                </p>
              </div>
            )}
            {selected.status === 'rejected' && (
              <div className='rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800'>
                <p>Reprovado em {fmtDate(selected.reviewedAt)}</p>
                {selected.rejectionReason && (
                  <p className='mt-1 whitespace-pre-wrap'>
                    Motivo: {selected.rejectionReason}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className='block text-xs text-gray-400 mb-1'>
                Anotações internas (só o admin vê)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={() =>
                  notes !== (selected.adminNotes || '') && saveNotes(selected)
                }
                className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50'
                placeholder='Ex.: ligou dia 30/10, pediu condição especial…'
              />
            </div>

            {/* Ações */}
            <div className='flex flex-wrap gap-2 pt-2 border-t border-gray-100'>
              {selected.status !== 'approved' && (
                <Button
                  onClick={() => approve(selected)}
                  loading={acting === 'approve'}
                >
                  <CheckCircle2 size={16} className='mr-1' /> Aprovar e enviar
                  tabela
                </Button>
              )}
              {selected.status === 'approved' && (
                <>
                  <Button
                    variant='secondary'
                    onClick={() => resend(selected)}
                    loading={acting === 'resend'}
                  >
                    <Mail size={16} className='mr-1' /> Reenviar acesso
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => revoke(selected)}
                    loading={acting === 'revoke'}
                  >
                    <ShieldOff size={16} className='mr-1' /> Revogar acesso
                  </Button>
                </>
              )}
              {selected.status !== 'rejected' && (
                <Button variant='outline' onClick={() => setRejectOpen(true)}>
                  <XCircle size={16} className='mr-1 text-red-500' /> Reprovar
                </Button>
              )}
              <Button
                variant='ghost'
                onClick={() => remove(selected)}
                className='ml-auto text-red-500'
              >
                <Trash2 size={16} className='mr-1' /> Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ REPROVAR ═══ */}
      <Modal
        isOpen={rejectOpen && !!selected}
        onClose={() => setRejectOpen(false)}
        title={`Reprovar ${selected?.tradeName ?? ''}`}
      >
        <div className='space-y-4 text-sm'>
          <p className='text-gray-600'>
            O lojista recebe um e-mail educado informando que o cadastro não foi
            aprovado. Se quiser, explique o motivo (vai no e-mail):
          </p>
          <textarea
            rows={4}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50'
            placeholder='Ex.: Já temos um revendedor atendendo a sua região.'
            maxLength={1000}
          />
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant='danger'
              onClick={confirmReject}
              loading={acting === 'reject'}
            >
              {acting === 'reject' ? (
                <Loader2 size={16} className='animate-spin' />
              ) : (
                <XCircle size={16} className='mr-1' />
              )}
              Confirmar reprovação
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Row({
  k,
  v,
  mono,
  full,
}: {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className='text-xs text-gray-400'>{k}</dt>
      <dd className={`text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>
        {v}
      </dd>
    </div>
  );
}
