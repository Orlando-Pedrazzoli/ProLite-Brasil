// 📄 src/app/api/newsletter/route.ts
// NEWSLETTER
//   POST  público — inscrição (modal ou barra do rodapé). Gera cupom único
//         de 10% (uso único, 30 dias), grava Subscriber e envia o e-mail de
//         boas-vindas. Quem já está inscrito não recebe novo cupom; quem
//         tinha cancelado é REATIVADO (sem novo cupom).
//   GET   admin — lista inscritos (?status=active|unsubscribed, ?search=,
//         ?source=) com contadores, para /admin/newsletter.
//
// v2: campo `source` aceite do cliente ('newsletter_modal' | 'footer' |
//     'checkout' | 'manual'); honeypot; rate limit por IP; reativação.

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Subscriber from '@/lib/models/Subscriber';
import Coupon from '@/lib/models/Coupon';
import { requireAdminGuard } from '@/lib/auth/guards';
import { isValidEmail } from '@/lib/utils/validators';
import { isDisposableEmail } from '@/lib/utils/disposableEmails';
import { sendNewsletterWelcome } from '@/lib/services/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DISCOUNT_PERCENT = 10;
const COUPON_VALID_DAYS = 30;
const SOURCES = new Set(['newsletter_modal', 'footer', 'checkout', 'manual']);

// Rate limit best-effort por IP (por instância serverless)
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
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
  if (hits.size > 1000)
    for (const [k, v] of hits)
      if (v.every(t => now - t >= RATE_WINDOW_MS)) hits.delete(k);
  return false;
}

// Caracteres sem ambíguos (sem O/0, I/1) para o código ser fácil de digitar
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return `BV${s}`;
}

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const exists = await Coupon.findOne({ code }).lean();
    if (!exists) return code;
  }
  return `BV${Date.now().toString(36).toUpperCase()}`;
}

const bad = (error: string, status = 400) =>
  NextResponse.json({ success: false, error }, { status });

// ─────────────────────────── POST (público) ───────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, name, birthday, consent } = body;

    // Honeypot
    if (typeof body.website === 'string' && body.website.trim()) {
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    if (isRateLimited(ip || 'unknown'))
      return bad('Muitas tentativas. Aguarde alguns minutos.', 429);

    if (!email || typeof email !== 'string' || !isValidEmail(email))
      return bad('Email inválido');
    if (!consent) return bad('É necessário aceitar receber nossos emails');
    if (isDisposableEmail(email))
      return bad('E-mail descartável não é permitido');

    const normalizedEmail = email.toLowerCase().trim();
    const source =
      typeof body.source === 'string' && SOURCES.has(body.source)
        ? body.source
        : 'newsletter_modal';
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : '';
    const birthDate =
      typeof birthday === 'string' && birthday && !isNaN(Date.parse(birthday))
        ? new Date(birthday)
        : null;

    await connectDB();

    // Já inscrito? Não emite novo cupom (anti-abuso). Se tinha cancelado,
    // reativa — o consentimento foi dado de novo agora.
    const existing = await Subscriber.findOne({ email: normalizedEmail });
    if (existing) {
      const updates: Record<string, unknown> = {};
      if (existing.status === 'unsubscribed') {
        updates.status = 'active';
        updates.consent = true;
      }
      if (!existing.name && cleanName) updates.name = cleanName;
      if (!existing.birthday && birthDate) updates.birthday = birthDate;
      if (Object.keys(updates).length) await existing.updateOne(updates);

      return NextResponse.json({
        success: true,
        alreadySubscribed: true,
        message:
          existing.status === 'unsubscribed'
            ? 'Bem-vindo de volta! Sua inscrição foi reativada.'
            : 'Você já está inscrito na nossa newsletter!',
      });
    }

    // Gera cupom único de uso único
    const code = await generateUniqueCode();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + COUPON_VALID_DAYS);

    await Coupon.create({
      code,
      type: 'percentage',
      value: DISCOUNT_PERCENT,
      minOrderValue: 0,
      maxDiscount: 0,
      usageLimit: 1,
      usedCount: 0,
      validFrom: new Date(),
      validUntil,
      isActive: true,
    });

    await Subscriber.create({
      email: normalizedEmail,
      name: cleanName,
      birthday: birthDate,
      consent: true,
      source,
      couponCode: code,
      status: 'active',
      ip,
    });

    // AGUARDADO (await): na Vercel, promises pendentes após a resposta são
    // congeladas. sendNewsletterWelcome nunca lança; falha de e-mail não
    // falha a inscrição (o cupom já aparece na UI).
    await sendNewsletterWelcome(
      normalizedEmail,
      cleanName,
      code,
      DISCOUNT_PERCENT,
      validUntil,
    ).catch(err => console.error('Newsletter email error:', err));

    return NextResponse.json({
      success: true,
      couponCode: code,
      discountPercent: DISCOUNT_PERCENT,
    });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return bad('Erro ao processar inscrição', 500);
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
    const source = searchParams.get('source');
    const search = searchParams.get('search')?.trim();

    const filter: Record<string, unknown> = {};
    if (status === 'active' || status === 'unsubscribed')
      filter.status = status;
    if (source && SOURCES.has(source)) filter.source = source;
    if (search) {
      const rx = {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
      filter.$or = [{ email: rx }, { name: rx }, { couponCode: rx }];
    }

    const [subscribers, counts] = await Promise.all([
      Subscriber.find(filter)
        .select('-ip')
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean(),
      Subscriber.aggregate<{ _id: string; n: number }>([
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
    ]);

    const summary = { active: 0, unsubscribed: 0 };
    for (const c of counts)
      if (c._id in summary) summary[c._id as keyof typeof summary] = c.n;

    return NextResponse.json({ success: true, subscribers, summary });
  } catch (error) {
    console.error('Newsletter list error:', error);
    return bad('Erro ao listar inscritos', 500);
  }
}
