// Chat do site. Responde com o catálogo, o FAQ e as páginas da loja.
// Encomenda só entra se houver sessão: o id vem do cookie, nunca do texto.
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { runAssistant } from '@/lib/chatbot/gemini';
import { buildSystemInstruction } from '@/lib/chatbot/prompt';
import { executeTool, SITE_TOOLS, type ToolContext } from '@/lib/chatbot/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_MESSAGES = 8;
const MAX_CHARS = 800;

interface IncomingMessage {
  role?: unknown;
  content?: unknown;
}

export async function POST(request: Request) {
  let body: { messages?: IncomingMessage[] };
  try {
    body = (await request.json()) as { messages?: IncomingMessage[] };
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    )
    .slice(-MAX_MESSAGES)
    .map(m => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_CHARS),
    }));

  const last = messages.at(-1);
  if (!last || last.role !== 'user') {
    return NextResponse.json({ error: 'Mensagem em falta.' }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const ctx: ToolContext = { handedOff: false, userId };

  const history = messages
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Atendimento'}: ${m.content}`)
    .join('\n');
  const sessionNote = userId
    ? 'O cliente está logado nesta conta. consultar_pedido devolve só as encomendas dela.'
    : 'O cliente NÃO está logado. consultar_pedido vai recusar. Peça o login, não os dados da encomenda.';

  try {
    const reply = await runAssistant({
      systemInstruction: buildSystemInstruction(),
      userInput: `${sessionNote}\n\nHistórico:\n${history}\n\nResponda à última mensagem do cliente.`,
      tools: SITE_TOOLS,
      executeTool: (name, args) => executeTool(name, args, ctx),
    });
    if (!reply) {
      return NextResponse.json(
        { error: 'Não consegui responder agora.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ reply, loggedIn: Boolean(userId) });
  } catch (err) {
    console.error('[Chat] falha:', err);
    return NextResponse.json(
      { error: 'Não consegui responder agora. Tente de novo em instantes.' },
      { status: 502 },
    );
  }
}
