// 📄 src/lib/chatbot/chatwoot.ts
// Cliente mínimo da API do Chatwoot usado pelo bot de atendimento, mais a
// verificação da assinatura dos webhooks.
//
// Envs (só no servidor):
//   CHATWOOT_BOT_TOKEN           token de acesso do robô (Configurações → Robôs)
//   CHATWOOT_BOT_WEBHOOK_SECRET  segredo de assinatura dos webhooks do robô
import { createHmac, timingSafeEqual } from 'crypto';
import { company } from '@/lib/config/company';

const { baseUrl: BASE_URL, accountId: ACCOUNT_ID } = company.chatwoot;

// Tolerância do timestamp assinado (proteção contra replay)
const MAX_SKEW_SECONDS = 5 * 60;

export type SignatureCheck =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Valida `X-Chatwoot-Signature: sha256=HMAC(secret, "{timestamp}.{rawBody}")`.
 * Falha fechado: sem segredo configurado, nenhum webhook é aceite.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): SignatureCheck {
  const secret = process.env.CHATWOOT_BOT_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: 'segredo não configurado' };
  if (!signature || !timestamp) {
    return { ok: false, reason: 'cabeçalhos de assinatura em falta' };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'timestamp inválido' };
  if (Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) {
    return { ok: false, reason: 'timestamp fora da tolerância' };
  }

  const expected =
    'sha256=' +
    createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'assinatura não confere' };
  }
  return { ok: true };
}

async function chatwootRequest<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
  const token = process.env.CHATWOOT_BOT_TOKEN;
  if (!token) throw new Error('CHATWOOT_BOT_TOKEN não configurado');

  const res = await fetch(
    `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}${path}`,
    {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        api_access_token: token,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Chatwoot ${init.method ?? 'GET'} ${path} → ${res.status} ${text.slice(0, 200)}`,
    );
  }
  return (await res.json()) as T;
}

export interface ChatwootMessage {
  id: number;
  content: string | null;
  // 0 = incoming (cliente), 1 = outgoing (bot/agente), 2 = activity, 3 = template
  message_type: number;
  private: boolean;
}

/** Mensagens da conversa, da mais antiga para a mais recente. */
export async function listMessages(
  conversationId: number,
): Promise<ChatwootMessage[]> {
  const data = await chatwootRequest<{ payload?: ChatwootMessage[] }>(
    `/conversations/${conversationId}/messages`,
  );
  return [...(data.payload ?? [])].sort((a, b) => a.id - b.id);
}

export async function sendMessage(
  conversationId: number,
  content: string,
): Promise<void> {
  await chatwootRequest(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { content, message_type: 'outgoing', private: false },
  });
}

/** Passa a conversa para a equipe humana (pending → open). */
export async function handoffToHuman(conversationId: number): Promise<void> {
  await chatwootRequest(`/conversations/${conversationId}/toggle_status`, {
    method: 'POST',
    body: { status: 'open' },
  });
}

/** Indicador "a escrever…" no widget. Nunca deve derrubar o fluxo. */
export async function setTyping(
  conversationId: number,
  on: boolean,
): Promise<void> {
  try {
    await chatwootRequest(
      `/conversations/${conversationId}/toggle_typing_status`,
      { method: 'POST', body: { typing_status: on ? 'on' : 'off' } },
    );
  } catch {
    // cosmético
  }
}
