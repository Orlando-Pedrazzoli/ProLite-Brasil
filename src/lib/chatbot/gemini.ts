// 📄 src/lib/chatbot/gemini.ts
// Ciclo de conversa com o Gemini (generateContent) e chamada de funções.
// A Interactions API estava a devolver 503 em vários modelos.
//
// Envs (só no servidor):
//   GEMINI_API_KEY  chave criada no Google AI Studio
//   GEMINI_MODEL    opcional; por omissão gemini-2.5-flash
const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];

const MAX_TOOL_ROUNDS = 2;

export interface FunctionTool {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<unknown>;

interface Part {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
}

interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

async function generate(model: string, body: Record<string, unknown>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gemini ${model} → ${res.status} ${text.slice(0, 220)}`);
  }
  return JSON.parse(text) as {
    candidates?: { content?: { parts?: Part[] } }[];
  };
}

function texts(parts: Part[]): string {
  return parts
    .map(p => p.text ?? '')
    .join('')
    .trim();
}

export async function runAssistant(params: {
  systemInstruction: string;
  userInput: string;
  tools: FunctionTool[];
  executeTool: ToolExecutor;
}): Promise<string> {
  const preferred = process.env.GEMINI_MODEL;
  const models = [...new Set([...MODELS, ...(preferred ? [preferred] : [])])];
  const declarations = params.tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
  let contents: Content[] = [
    { role: 'user', parts: [{ text: params.userInput }] },
  ];
  const errors: string[] = [];

  for (const model of models) {
    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const data = await generate(model, {
          systemInstruction: { parts: [{ text: params.systemInstruction }] },
          contents,
          tools: [{ functionDeclarations: declarations }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.2 },
        });
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const calls = parts.filter(p => p.functionCall?.name);
        if (calls.length === 0) {
          const reply = texts(parts);
          if (reply) return reply;
          throw new Error(`Gemini ${model} terminou sem texto`);
        }
        contents = [
          ...contents,
          { role: 'model', parts },
          {
            role: 'user',
            parts: await Promise.all(
              calls.map(async part => {
                const call = part.functionCall!;
                let result: unknown;
                try {
                  result = await params.executeTool(call.name, call.args ?? {});
                } catch (err) {
                  console.error(`[Chatbot] ferramenta ${call.name} falhou:`, err);
                  result = { erro: 'Não foi possível consultar esta informação agora.' };
                }
                return {
                  functionResponse: {
                    name: call.name,
                    response: { resultado: result },
                  },
                };
              }),
            ),
          },
        ];
      }
      errors.push(`Gemini ${model} excedeu as ferramentas`);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'erro');
      contents = [{ role: 'user', parts: [{ text: params.userInput }] }];
    }
  }
  throw new Error(errors.join(' | ').slice(0, 500));
}

/** Resposta em pedaços, sem ferramentas. O texto sai assim que o modelo o gera. */
export async function* streamAssistant(params: {
  systemInstruction: string;
  userInput: string;
}): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

  const models = [...new Set(MODELS)];
  let lastError = 'Gemini indisponível';

  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: params.systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: params.userInput }] }],
          generationConfig: { maxOutputTokens: 280, temperature: 0.2 },
        }),
        cache: 'no-store',
      },
    );
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      lastError = `Gemini ${model} → ${res.status} ${text.slice(0, 180)}`;
      continue;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let emitted = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const data = JSON.parse(payload) as {
            candidates?: { content?: { parts?: Part[] } }[];
          };
          const parts = data.candidates?.[0]?.content?.parts ?? [];
          const text = parts.map(p => p.text ?? '').join('');
          if (text) {
            emitted = true;
            yield text;
          }
        } catch {
          // um pedaço de JSON ainda incompleto volta no buffer
        }
      }
    }
    if (emitted) return;
    lastError = `Gemini ${model} terminou sem texto`;
  }
  throw new Error(lastError);
}
