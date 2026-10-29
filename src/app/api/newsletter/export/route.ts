// 📄 src/app/api/newsletter/export/route.ts
// NEWSLETTER — exportação CSV (admin) para e-mail marketing.
//   GET /api/newsletter/export?status=active   (padrão: só ativos)
//
// Formato pensado para importar direto em Resend Audiences, Mailchimp,
// Brevo, RD Station etc.: cabeçalho em inglês (email, first_name,
// last_name, birthday, source, coupon, status, subscribed_at), UTF-8 com
// BOM (o Excel abre com acentos certos), separador vírgula, datas ISO.

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Subscriber from '@/lib/models/Subscriber';
import { requireAdminGuard } from '@/lib/auth/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const csvCell = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const isoDate = (d?: Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : '';

export async function GET(request: NextRequest) {
  const guard = await requireAdminGuard();
  if (guard.response) return guard.response;

  try {
    await connectDB();
    const status = request.nextUrl.searchParams.get('status') ?? 'active';
    const filter: Record<string, unknown> = {};
    if (status === 'active' || status === 'unsubscribed')
      filter.status = status;

    const subs = await Subscriber.find(filter)
      .select('email name birthday source couponCode status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const header = [
      'email',
      'first_name',
      'last_name',
      'birthday',
      'source',
      'coupon',
      'status',
      'subscribed_at',
    ];
    const lines = subs.map(s => {
      const parts = (s.name || '').trim().split(/\s+/).filter(Boolean);
      const first = parts.shift() || '';
      const last = parts.join(' ');
      return [
        s.email,
        first,
        last,
        isoDate(s.birthday),
        s.source,
        s.couponCode || '',
        s.status,
        new Date(s.createdAt).toISOString(),
      ]
        .map(csvCell)
        .join(',');
    });

    const csv = '﻿' + [header.join(','), ...lines].join('\r\n') + '\r\n';
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="newsletter-prolite-${status}-${date}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Newsletter export error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao exportar' },
      { status: 500 },
    );
  }
}
