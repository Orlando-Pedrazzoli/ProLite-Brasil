// 📄 src/lib/chatbot/gemini.ts
// Ciclo de conversa com o Gemini (Interactions API) com chamada de funções.
// Docs: https://ai.google.dev/gemini-api/docs/interactions-overview
//
// Envs (só no servidor):
//   GEMINI_API_KEY  chave criada no Google AI Studio
//   GEMINI_MODEL    opcional; por omissão gemini-flash-latest
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const DEFAULT_MODEL = 'gemini-flash-latest';
const FALLBACK_MODEL = 'gemini-2.5-flash';

// Máximo de idas e voltas modelo ↔ ferramentas por mensagem do cliente
const MAX_TOOL_ROUNDS = 5;

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

interface ContentItem {
  type: string;
  text?: string;
}

interface Step {
  type: string;
  id?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  content?: ContentItem[];
}

interface Interaction {
  id: string;
  status: string;
  steps?: Step[];
}

async function createInteraction(
  body: Record<string, unknown>,
): Promise<Interaction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

  const preferred = String(body.model || DEFAULT_MODEL);
  const models = body.previous_interaction_id
    ? [preferred]
    : [...new Set([preferred, FALLBACK_MODEL])];

  let lastError = 'Gemini indisponível';
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({ ...body, model }),
        cache: 'no-store',
      });
      if (res.ok) return (await res.json()) as Interaction;
      const text = await res.text().catch(() => '');
      lastError = `Gemini → ${res.status} ${text.slice(0, 400)}`;
      const busy = res.status === 503 || res.status === 429;
      if (!busy) throw new Error(lastError);
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw new Error(lastError);
}

function outputText(interaction: Interaction): string {
  return (interaction.steps ?? [])
    .filter(s => s.type === 'model_output')
    .flatMap(s => s.content ?? [])
    .filter(c => c.type === 'text' && c.text)
    .map(c => c.text)
    .join('')
    .trim();
}

/**
 * Envia a mensagem ao modelo e executa as funções que ele pedir, até ele
 * devolver texto. Devolve '' se o modelo terminar sem texto.
 */
export async function runAssistant(params: {
  systemInstruction: string;
  userInput: string;
  tools: FunctionTool[];
  executeTool: ToolExecutor;
}): Promise<string> {
  const base = {
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    system_instruction: params.systemInstruction,
    tools: params.tools,
    generation_config: { thinking_level: 'low', max_output_tokens: 1200 },
  };

  let interaction = await createInteraction({
    ...base,
    input: params.userInput,
  });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const calls = (interaction.steps ?? []).filter(
      s => s.type === 'function_call' && s.id && s.name,
    );
    if (interaction.status !== 'requires_action' || calls.length === 0) break;

    const results = await Promise.all(
      calls.map(async call => {
        let result: unknown;
        try {
          result = await params.executeTool(
            call.name as string,
            call.arguments ?? {},
          );
        } catch (err) {
          console.error(`[Chatbot] ferramenta ${call.name} falhou:`, err);
          result = {
            erro: 'Não foi possível consultar esta informação agora.',
          };
        }
        return {
          type: 'function_result',
          name: call.name,
          call_id: call.id,
          result: JSON.stringify(result),
        };
      }),
    );

    interaction = await createInteraction({
      ...base,
      previous_interaction_id: interaction.id,
      input: results,
    });
  }

  return outputText(interaction);
}
