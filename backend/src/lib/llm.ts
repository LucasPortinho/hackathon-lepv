import 'dotenv/config';

export interface ChatMessage { role: 'system' | 'user'; content: string }
export type ModelFn = (messages: ChatMessage[]) => Promise<string>;

/** Chama o modelo pela API da Featherless (formato OpenAI). Configuração em FEATHERLESS_* no .env. */
export const callModel: ModelFn = async (messages) => {
  const key = process.env.FEATHERLESS_API_KEY;
  if (!key) throw new Error('Falta FEATHERLESS_API_KEY no .env.');
  const baseUrl = process.env.FEATHERLESS_BASE_URL ?? 'https://api.featherless.ai/v1';
  const model = process.env.FEATHERLESS_MODEL ?? 'moonshotai/Kimi-K2.7-Code';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    // Modelos que raciocinam gastam tokens antes de responder: com limite baixo a resposta sai cortada.
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 6000 }),
  });
  if (!response.ok) throw new Error(`Erro ${response.status} da API: ${(await response.text()).slice(0, 300)}`);
  const data = (await response.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
};
