// 📄 src/app/api/chatwoot/bot/route.ts
// Webhook do robô de atendimento (Chatwoot Agent Bot).
//
// Fluxo: o Chatwoot envia cada mensagem do cliente → validamos a assinatura
// → respondemos 200 de imediato → em segundo plano o assistente (Gemini +
// ferramentas do site) gera a resposta e publica-a na conversa.
//
// O robô só responde enquanto a conversa está "pending". Quando ele (ou um
// agente) a passa para "open", o atendimento é humano e o robô cala-se.
import { after, NextResponse } from 'next/server';
import {
  handoffToHuman,
  listMessages,
  sendMessage,
  setTyping,
  verifyWebhookSignature,
  type ChatwootMessage,
} from '@/lib/chatbot/chatwoot';
import { runAssistant } from '@/lib/chatbot/gemini';
import { buildSystemInstruction } from '@/lib/chatbot/prompt';
import { executeTool, TOOLS, type ToolContext } from '@/lib/chatbot/tools';
import { company } from '@/lib/config/company';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Quantas mensagens anteriores entram como contexto
const HISTORY_LIMIT = 14;

const FALLBACK_MESSAGE = `Desculpe, não consegui responder agora. Passei a sua conversa para a nossa equipe, que atende ${company.businessHours}.`;

interface WebhookPayload {
  event?: string;
  id?: number;
  content?: string | null;
  message_type?: string | number;
  private?: boolean;
  conversation?: { id?: number; status?: string };
}

const isIncoming = (t: unknown) => t === 'incoming' || t === 0;

function buildUserInput(history: ChatwootMessage[], current: string): string {
  const lines = history
    .filter(m => !m.private && m.content && [0, 1, 3].includes(m.message_type))
    .slice(-HISTORY_LIMIT)
    .map(
      m => `${m.message_type === 0 ? 'Cliente' : 'Atendimento'}: ${m.content}`,
    );
  if (lines.length === 0) return current;
  // O histórico pode ainda não incluir a mensagem que disparou o webhook
  if (lines.at(-1) !== `Cliente: ${current}`) lines.push(`Cliente: ${current}`);
  return `Histórico da conversa (do mais antigo para o mais recente):\n${lines.join('\n')}\n\nResponda à última mensagem do cliente.`;
}

async function handleMessage(
  conversationId: number,
  messageId: number | undefined,
  content: string,
) {
  const ctx: ToolContext = { conversationId, handedOff: false };
  try {
    await setTyping(conversationId, true);

    let history: ChatwootMessage[] = [];
    try {
      history = await listMessages(conversationId);
    } catch (err) {
      console.warn('[Chatbot] sem histórico, sigo só com a mensagem:', err);
    }

    const reply = await runAssistant({
      systemInstruction: buildSystemInstruction(),
      userInput: buildUserInput(history, content),
      tools: TOOLS,
      executeTool: (name, args) => executeTool(name, args, ctx),
    });

    // Se o cliente já escreveu outra mensagem entretanto, a execução dessa
    // mensagem responde com o histórico completo: evita respostas duplicadas.
    if (messageId && !ctx.handedOff) {
      try {
        const latest = (await listMessages(conversationId))
          .filter(m => m.message_type === 0 && !m.private)
          .at(-1);
        if (latest && latest.id > messageId) return;
      } catch {
        // sem confirmação, responde na mesma
      }
    }

    if (!reply) throw new Error('modelo terminou sem texto');
    await sendMessage(conversationId, reply);
  } catch (err) {
    console.error('[Chatbot] falha ao responder:', err);
    try {
      await sendMessage(conversationId, FALLBACK_MESSAGE);
      if (!ctx.handedOff) await handoffToHuman(conversationId);
    } catch (fallbackErr) {
      console.error('[Chatbot] falha no fallback:', fallbackErr);
    }
  } finally {
    await setTyping(conversationId, false);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const check = verifyWebhookSignature(
    rawBody,
    request.headers.get('x-chatwoot-signature'),
    request.headers.get('x-chatwoot-timestamp'),
  );
  if (!check.ok) {
    console.warn(`[Chatbot] webhook recusado: ${check.reason}`);
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const conversationId = payload.conversation?.id;
  const content = (payload.content ?? '').trim();
  const shouldReply =
    payload.event === 'message_created' &&
    isIncoming(payload.message_type) &&
    !payload.private &&
    payload.conversation?.status === 'pending' &&
    typeof conversationId === 'number';

  if (!shouldReply) return NextResponse.json({ ok: true, ignored: true });

  if (!content) {
    // Só anexo (foto, áudio): o assistente não lê ficheiros → equipe humana
    after(async () => {
      try {
        await sendMessage(
          conversationId,
          `Recebi o seu arquivo. Como sou um assistente virtual e não consigo abrir anexos, passei a conversa para a nossa equipe, que atende ${company.businessHours}.`,
        );
        await handoffToHuman(conversationId);
      } catch (err) {
        console.error('[Chatbot] falha ao tratar anexo:', err);
      }
    });
    return NextResponse.json({ ok: true });
  }

  after(() => handleMessage(conversationId, payload.id, content));
  return NextResponse.json({ ok: true });
}
