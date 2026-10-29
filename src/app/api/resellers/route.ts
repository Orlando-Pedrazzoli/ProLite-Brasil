// 📄 src/app/api/resellers/route.ts
// REVENDEDORES
//   POST  público — candidatura do formulário /revendedores. Grava na base
//         (status pending), avisa a loja (company.email) e confirma ao
//         lojista. Anti-spam igual ao /api/contact (honeypot + rate limit
//         por IP + e-mail descartável) e validação de CNPJ (dígitos).
//   GET   admin — lista candidaturas (?status=pending|approved|rejected,
//         ?search=).
//
// Envio de e-mail AGUARDADO (await): na Vercel, promises pendentes após a
// resposta são congeladas. A candidatura fica gravada mesmo que o e-mail
// falhe — o Maurício vê tudo no painel.

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Reseller from '@/lib/models/Reseller';
import { requireAdminGuard } from '@/lib/auth/guards';
import {
  isValidEmail,
  isValidCNPJ,
  isValidPhone,
} from '@/lib/utils/validators';
import { isDisposableEmail } from '@/lib/utils/disposableEmails';
import {
  sendResellerApplicationNotification,
  sendResellerApplicationReceived,
} from '@/lib/services/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const LIMITS = {
  companyName: 160,
  tradeName: 120,
  stateRegistration: 30,
  website: 200,
  contactName: 120,
  email: 200,
  message: 2000,
  cep: 9,
  street: 160,
  number: 20,
  complement: 80,
  neighborhood: 80,
  city: 80,
  state: 2,
} as const;

const STORE_TYPES = new Set(['fisica', 'online', 'ambas']);

// Rate limit best-effort por IP (por instância serverless)
const RATE_WINDOW_MS = 30 * 60 * 1000;
const RATE_MAX = 3;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 1000) {
    for (const [k, v] of hits) {
      if (v.every(t => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';
const digits = (v: unknown): string =>
  typeof v === 'string' ? v.replace(/\D/g, '') : '';

const bad = (error: string, status = 400) =>
  NextResponse.json({ success: false, error }, { status });

// ─────────────────────────── POST (público) ───────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Honeypot: sucesso falso de propósito
    if (typeof body.website_url === 'string' && body.website_url.trim()) {
      return NextResponse.json({ success: true });
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    if (isRateLimited(ip)) {
      return bad(
        'Muitos envios em pouco tempo. Aguarde alguns minutos ou fale conosco pelo WhatsApp.',
        429,
      );
    }

    const companyName = clean(body.companyName, LIMITS.companyName);
    const tradeName =
      clean(body.tradeName, LIMITS.tradeName) || companyName.slice(0, 120);
    const cnpj = digits(body.cnpj);
    const stateRegistration = clean(
      body.stateRegistration,
      LIMITS.stateRegistration,
    );
    const storeType = clean(body.storeType, 10);
    const website = clean(body.website, LIMITS.website);
    const contactName = clean(body.contactName, LIMITS.contactName);
    const email = clean(body.email, LIMITS.email).toLowerCase();
    const phone = digits(body.phone);
    const message = clean(body.message, LIMITS.message);
    const addr = (body.address ?? {}) as Record<string, unknown>;
    const address = {
      cep: digits(addr.cep).slice(0, 8),
      street: clean(addr.street, LIMITS.street),
      number: clean(addr.number, LIMITS.number),
      complement: clean(addr.complement, LIMITS.complement),
      neighborhood: clean(addr.neighborhood, LIMITS.neighborhood),
      city: clean(addr.city, LIMITS.city),
      state: clean(addr.state, LIMITS.state).toUpperCase(),
    };

    if (companyName.length < 3) return bad('Informe a razão social.');
    if (!isValidCNPJ(cnpj)) return bad('CNPJ inválido.');
    if (!STORE_TYPES.has(storeType)) return bad('Informe o tipo de loja.');
    if (contactName.length < 3) return bad('Informe o nome do responsável.');
    if (!isValidEmail(email)) return bad('E-mail inválido.');
    if (isDisposableEmail(email))
      return bad('E-mail descartável não é permitido.');
    if (!isValidPhone(phone)) return bad('WhatsApp inválido (com DDD).');
    if (address.city.length < 2 || address.state.length !== 2)
      return bad('Informe cidade e estado da loja.');

    await connectDB();

    const existing = await Reseller.findOne({
      $or: [{ cnpj }, { email }],
    }).lean();
    if (existing) {
      const msg =
        existing.status === 'approved'
          ? 'Este CNPJ/e-mail já é revendedor Pro-Lite. Se perdeu o link da tabela de preços, fale conosco.'
          : existing.status === 'pending'
            ? 'Já recebemos um pedido com este CNPJ/e-mail — está em análise. Em breve respondemos por e-mail.'
            : 'Já existe um pedido com este CNPJ/e-mail. Fale conosco pelo WhatsApp para reavaliarmos.';
      return bad(msg, 409);
    }

    const reseller = await Reseller.create({
      companyName,
      tradeName,
      cnpj,
      stateRegistration,
      storeType,
      website,
      address,
      contactName,
      email,
      phone,
      message,
      status: 'pending',
      ip,
      userAgent: (request.headers.get('user-agent') || '').slice(0, 300),
    });

    const plain = reseller.toObject();
    const [storeOk] = await Promise.all([
      sendResellerApplicationNotification(plain),
      sendResellerApplicationReceived(plain).catch(() => false),
    ]);
    if (!storeOk) {
      console.error(
        '[Resellers] candidatura gravada, mas e-mail à loja falhou:',
        email,
      );
    }

    return NextResponse.json({ success: true, id: String(reseller._id) });
  } catch (error) {
    console.error('[Resellers] POST erro:', error);
    return bad('Erro ao enviar o cadastro. Tente novamente.', 500);
  }
}

// ─────────────────────────── GET (admin) ───────────────────────────
export async function GET(request: NextRequest) {
  const guard = await requireAdminGuard();
  if (guard.response) return guard.response;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();

    const filter: Record<string, unknown> = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status))
      filter.status = status;
    if (search) {
      const rx = {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
      filter.$or = [
        { companyName: rx },
        { tradeName: rx },
        { contactName: rx },
        { email: rx },
        { cnpj: { $regex: search.replace(/\D/g, '') || '^$' } },
        { 'address.city': rx },
      ];
    }

    const [resellers, counts] = await Promise.all([
      Reseller.find(filter)
        .select('-accessTokenHash -userAgent')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      Reseller.aggregate<{ _id: string; n: number }>([
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
    ]);

    const summary = { pending: 0, approved: 0, rejected: 0 };
    for (const c of counts)
      if (c._id in summary) summary[c._id as keyof typeof summary] = c.n;

    return NextResponse.json({ success: true, resellers, summary });
  } catch (error) {
    console.error('[Resellers] GET erro:', error);
    return bad('Erro ao listar revendedores.', 500);
  }
}
