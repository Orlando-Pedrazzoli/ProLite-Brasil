// 📄 src/app/api/resellers/[id]/route.ts
// REVENDEDORES — ações do admin sobre UMA candidatura.
//
//   PATCH { action: 'approve' }                 → status approved, gera token
//                                                 de acesso e envia e-mail
//                                                 com o link da tabela
//   PATCH { action: 'reject', reason? }         → status rejected, apaga o
//                                                 token (revoga acesso) e
//                                                 envia e-mail ao lojista
//   PATCH { action: 'resend' }                  → (só approved) novo token +
//                                                 reenvio do e-mail de acesso
//   PATCH { action: 'revoke' }                  → (só approved) apaga o token;
//                                                 o lojista perde o acesso mas
//                                                 continua aprovado
//   PATCH { action: 'notes', notes }            → anotações internas
//   DELETE                                      → apaga a candidatura (permite
//                                                 ao lojista candidatar-se de
//                                                 novo com o mesmo CNPJ)
//
// E-mails AGUARDADOS (Vercel congela promises após a resposta). A ação na
// base acontece primeiro; se o e-mail falhar, devolvemos emailSent:false e
// o admin pode usar "Reenviar acesso".

import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db/connect';
import Reseller from '@/lib/models/Reseller';
import { requireAdminGuard } from '@/lib/auth/guards';
import {
  buildAccessUrl,
  generateAccessToken,
} from '@/lib/services/resellerAccess';
import {
  sendResellerApproved,
  sendResellerRejected,
} from '@/lib/services/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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
    const action = String(body.action || '');

    await connectDB();
    const reseller = await Reseller.findById(id);
    if (!reseller) return bad('Candidatura não encontrada.', 404);

    const reviewer = Types.ObjectId.isValid(guard.userId)
      ? new Types.ObjectId(guard.userId)
      : null;

    let emailSent: boolean | null = null;

    switch (action) {
      case 'approve':
      case 'resend': {
        if (action === 'resend' && reseller.status !== 'approved')
          return bad(
            'Só é possível reenviar o acesso a revendedores aprovados.',
          );

        const { token, hash } = generateAccessToken();
        reseller.status = 'approved';
        reseller.rejectionReason = '';
        reseller.accessTokenHash = hash;
        reseller.accessTokenCreatedAt = new Date();
        if (action === 'approve') {
          reseller.reviewedAt = new Date();
          reseller.reviewedBy = reviewer;
        }
        await reseller.save();

        emailSent = await sendResellerApproved(
          reseller.toObject(),
          buildAccessUrl(token),
        );
        break;
      }

      case 'reject': {
        reseller.status = 'rejected';
        reseller.rejectionReason =
          typeof body.reason === 'string'
            ? body.reason.trim().slice(0, 1000)
            : '';
        reseller.accessTokenHash = ''; // revoga acesso imediatamente
        reseller.reviewedAt = new Date();
        reseller.reviewedBy = reviewer;
        await reseller.save();

        emailSent =
          body.notify === false
            ? null
            : await sendResellerRejected(reseller.toObject());
        break;
      }

      case 'revoke': {
        if (reseller.status !== 'approved')
          return bad(
            'Só é possível revogar o acesso de revendedores aprovados.',
          );
        reseller.accessTokenHash = '';
        await reseller.save();
        break;
      }

      case 'notes': {
        reseller.adminNotes =
          typeof body.notes === 'string'
            ? body.notes.trim().slice(0, 2000)
            : '';
        await reseller.save();
        break;
      }

      default:
        return bad('Ação inválida.');
    }

    const out = reseller.toObject() as unknown as Record<string, unknown>;
    delete out.accessTokenHash;
    delete out.userAgent;

    return NextResponse.json({ success: true, reseller: out, emailSent });
  } catch (error) {
    console.error('[Resellers] PATCH erro:', error);
    return bad('Erro ao atualizar candidatura.', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const guard = await requireAdminGuard();
  if (guard.response) return guard.response;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return bad('ID inválido.');

  try {
    await connectDB();
    const res = await Reseller.deleteOne({ _id: id });
    if (!res.deletedCount) return bad('Candidatura não encontrada.', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Resellers] DELETE erro:', error);
    return bad('Erro ao excluir candidatura.', 500);
  }
}
