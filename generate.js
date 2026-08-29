export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método não permitido" }), { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Falta configurar a chave ANTHROPIC_API_KEY no Netlify." }),
      { status: 500 }
    );
  }

  let prompt;
  try {
    const body = await req.json();
    prompt = body.prompt;
    if (!prompt) throw new Error("Falta o campo 'prompt'");
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Pedido inválido: " + (err?.message || String(err)) }), { status: 400 });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const rawText = await response.text();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Erro da API (${response.status}): ${rawText.slice(0, 300)}` }),
        { status: 502 }
      );
    }

    const data = JSON.parse(rawText);
    const text = data.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    return new Response(JSON.stringify({ ok: true, text }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Erro no servidor: " + (err?.message || String(err)) }), { status: 500 });
  }
};
