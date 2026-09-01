import { getStore } from "@netlify/blobs";

// Avatar e voz por omissão do HeyGen (exemplos públicos da documentação).
// Mais tarde podemos deixar escolher isto na app, se quiseres.
const DEFAULT_AVATAR_ID = "Daisy-inskirt-20220818";
const DEFAULT_VOICE_ID = "2d5b0e6cf36f460aa7fc47e3eee4ba54";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método não permitido" }), { status: 405 });
  }

  let topic;
  try {
    const body = await req.json();
    topic = body.topic;
    if (!topic) throw new Error("Falta o campo 'topic'");
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Pedido inválido: " + (err?.message || String(err)) }), { status: 400 });
  }

  // A chave do HeyGen vem das Definições da app (Netlify Blobs), não de
  // variáveis de ambiente — para poderes inserir/trocar sem tocar no Netlify.
  const settingsStore = getStore({ name: "optic-settings", consistency: "strong" });
  const heygenApiKey = await settingsStore.get("heygenApiKey", { type: "text" });
  if (!heygenApiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Falta configurar a chave da API do HeyGen. Vai a Definições e adiciona a tua chave." }),
      { status: 500 }
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Falta configurar a chave ANTHROPIC_API_KEY no Netlify." }),
      { status: 500 }
    );
  }

  // 1. Gerar o guião do vídeo com Claude
  let script;
  try {
    const scriptPrompt = `Escreve um guião curto (máx. 60 segundos falados, cerca de 130-150 palavras) para um vídeo de apresentador a explicar, para clientes de uma ótica em Portugal, o seguinte tema: "${topic}".

Tom próximo, claro, profissional mas simples, em português de Portugal, escrito para ser falado em voz alta (frases curtas, sem markdown, sem hashtags, sem listas). Termina com uma chamada à ação simples para visitar a Opticalia Felgueiras.

Responde APENAS com o texto do guião, nada mais.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: scriptPrompt }],
      }),
    });

    const rawText = await response.text();
    if (!response.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Erro ao gerar o guião (${response.status}): ${rawText.slice(0, 300)}` }),
        { status: 502 }
      );
    }

    const data = JSON.parse(rawText);
    script = data.content.map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
    if (!script) throw new Error("O guião veio vazio.");
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Erro ao gerar o guião: " + (err?.message || String(err)) }), { status: 500 });
  }

  // 2. Pedir ao HeyGen para gerar o vídeo com esse guião
  try {
    const response = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": heygenApiKey,
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: "avatar", avatar_id: DEFAULT_AVATAR_ID, avatar_style: "normal" },
            voice: { type: "text", input_text: script, voice_id: DEFAULT_VOICE_ID },
          },
        ],
        dimension: { width: 1280, height: 720 },
      }),
    });

    const rawText = await response.text();
    if (!response.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Erro do HeyGen (${response.status}): ${rawText.slice(0, 300)}` }),
        { status: 502 }
      );
    }

    const data = JSON.parse(rawText);
    const videoId = data?.data?.video_id;
    if (!videoId) {
      return new Response(JSON.stringify({ ok: false, error: "O HeyGen não devolveu um ID de vídeo." }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true, sessionId: videoId, script }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Erro no servidor ao ligar ao HeyGen: " + (err?.message || String(err)) }),
      { status: 500 }
    );
  }
};
