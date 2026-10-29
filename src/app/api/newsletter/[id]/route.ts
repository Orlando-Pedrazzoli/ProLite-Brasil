// 📄 src/app/api/newsletter/[id]/route.ts
// NEWSLETTER — ações do admin sobre UM inscrito.
//   PATCH { status: 'active' | 'unsubscribed' }  → ativa / cancela
//   PATCH { name?, birthday? }                   → edita dados
//   DELETE                                       → remove definitivamente
//                                                  (pedido LGPD de exclusão)

import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db/connect';
import Subscriber from '@/lib/models/Subscriber';
import { requireAdminGuard } from '@/lib/auth/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const bad = (error: string, status = 400) =>
  NextResponse.json({ success: false, error }, { status });

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireAdminGuard();
  if (guard.response) return guard.response;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return bad('ID inválido.');

  try {
    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};

    if (body.status === 'active' || body.status === 'unsubscribed')
      updates.status = body.status;
    if (typeof body.name === 'string')
      updates.name = body.name.trim().slice(0, 100);
    if (body.birthday === null || body.birthday === '') updates.birthday = null;
    else if (
      typeof body.birthday === 'string' &&
      !isNaN(Date.parse(body.birthday))
    )
      updates.birthday = new Date(body.birthday);

    if (!Object.keys(updates).length) return bad('Nada para atualizar.');

    await connectDB();
    const subscriber = await Subscriber.findByIdAndUpdate(id, updates, {
      new: true,
    })
      .select('-ip')
      .lean();
    if (!subscriber) return bad('Inscrito não encontrado.', 404);

    return NextResponse.json({ success: true, subscriber });
  } catch (error) {
    console.error('Newsletter PATCH error:', error);
    return bad('Erro ao atualizar inscrito.', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const guard = await requireAdminGuard();
  if (guard.response) return guard.response;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return bad('ID inválido.');

  try {
    await connectDB();
    const res = await Subscriber.deleteOne({ _id: id });
    if (!res.deletedCount) return bad('Inscrito não encontrado.', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Newsletter DELETE error:', error);
    return bad('Erro ao excluir inscrito.', 500);
  }
}
