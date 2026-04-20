import { config } from '../config.js';
import { aiApiRequestDuration } from '../metrics.js';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Streams tokens from the AI provider. Falls back to a deterministic mock stream
 * when no API key is configured so the system is fully runnable out of the box.
 * Yields text chunks (deltas).
 */
export async function* streamChat(messages: ChatTurn[], signal?: AbortSignal): AsyncGenerator<string, void, void> {
  const start = Date.now();
  let status = 'ok';

  try {
    if (!config.ai.apiKey) {
      yield* mockStream(messages);
      return;
    }

    const res = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
      signal,
    });

    if (!res.ok || !res.body) {
      status = `error_${res.status}`;
      const text = await res.text().catch(() => '');
      throw new Error(`AI provider error ${res.status}: ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload);
          const delta: string | undefined = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // ignore malformed chunk
        }
      }
    }
  } catch (err) {
    if (status === 'ok') status = 'exception';
    throw err;
  } finally {
    aiApiRequestDuration.observe(
      { model: config.ai.model, status },
      (Date.now() - start) / 1000,
    );
  }
}

async function* mockStream(messages: ChatTurn[]): AsyncGenerator<string, void, void> {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const systemPrompt = messages.find((m) => m.role === 'system')?.content ?? '';
  const answer = buildMockAnswer(lastUser, systemPrompt);
  const tokens = answer.split(/(\s+)/);
  for (const t of tokens) {
    await new Promise((r) => setTimeout(r, 25 + Math.random() * 60));
    yield t;
  }
}

function buildMockAnswer(userMsg: string, systemPrompt: string): string {
  const persona = systemPrompt.slice(0, 80);
  return (
    `Claro, entiendo tu consulta: "${userMsg.slice(0, 120)}". ` +
    `Basándome en lo que me cuentas te comparto una respuesta simulada (modo mock, sin API key configurada). ` +
    `Persona activa: ${persona || 'asistente genérico'}. ` +
    `Para respuestas reales, configura AI_API_KEY en el archivo .env.`
  );
}
