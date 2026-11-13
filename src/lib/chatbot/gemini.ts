// 📄 src/lib/chatbot/gemini.ts
// Ciclo de conversa com o Gemini (generateContent) e chamada de funções.
// A Interactions API estava a devolver 503 em vários modelos.
//
// Envs (só no servidor):
//   GEMINI_API_KEY  chave criada no Google AI Studio
//   GEMINI_MODEL    opcional; por omissão gemini-2.5-flash
const MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];

const MAX_TOOL_ROUNDS = 4;

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
          generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
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
