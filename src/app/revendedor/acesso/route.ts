// 📄 src/app/revendedor/acesso/route.ts
// Link do e-mail de aprovação: /revendedor/acesso?token=...
// Valida o token (revendedor APROVADO), grava o cookie httpOnly e
// redireciona para a tabela de preços. Token inválido/revogado →
// /revendedores?acesso=invalido (aviso + formulário).
//
// É um Route Handler (e não a própria página) porque só aqui se pode
// gravar cookies; a página da tabela apenas lê o cookie.

import { NextRequest, NextResponse } from 'next/server';
import {
  RESELLER_COOKIE,
  RESELLER_COOKIE_MAX_AGE,
  findApprovedResellerByToken,
} from '@/lib/services/resellerAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const reseller = await findApprovedResellerByToken(token);

  if (!reseller || !token) {
    return NextResponse.redirect(
      new URL('/revendedores?acesso=invalido', request.url),
    );
  }

  const res = NextResponse.redirect(
    new URL('/revendedor/tabela-de-precos', request.url),
  );
  res.cookies.set(RESELLER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/revendedor',
    maxAge: RESELLER_COOKIE_MAX_AGE,
  });
  return res;
}
