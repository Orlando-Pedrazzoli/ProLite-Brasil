// 📄 src/app/api/chatwoot/identity/route.ts
// Validação de identidade do Chatwoot (HMAC).
// Devolve o identificador do cliente logado e o HMAC-SHA256 desse
// identificador, assinado com o token HMAC da caixa de entrada do site
// (Chatwoot → Configurações → Caixas de entrada → Configuração).
// O segredo fica só no servidor (env CHATWOOT_HMAC_TOKEN). Sem a env, o
// hash vai null e o widget identifica o cliente sem validação.
import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Não autenticado' },
      { status: 401 },
    );
  }

  const identifier = session.user.id;
  const secret = process.env.CHATWOOT_HMAC_TOKEN;
  const identifierHash = secret
    ? createHmac('sha256', secret).update(identifier).digest('hex')
    : null;

  return NextResponse.json(
    { success: true, identifier, identifierHash },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
