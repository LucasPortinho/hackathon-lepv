// Chamada ao modelo pela API da Featherless (formato compatível com a OpenAI).

export async function chamarModelo(mensagens) {
  const chave = process.env.FEATHERLESS_API_KEY;
  if (!chave) {
    throw new Error("Falta FEATHERLESS_API_KEY. Preencha o arquivo .env (veja .env.example).");
  }
  const baseUrl = process.env.FEATHERLESS_BASE_URL || "https://api.featherless.ai/v1";
  const modelo = process.env.FEATHERLESS_MODEL || "moonshotai/Kimi-K2.7-Code";

  const resposta = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chave}`,
    },
    body: JSON.stringify({
      model: modelo,
      messages: mensagens,
      temperature: 0.4,
      max_tokens: 6000,
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`Erro ${resposta.status} da API: ${corpo.slice(0, 300)}`);
  }
  const dados = await resposta.json();
  return dados.choices[0].message.content;
}
