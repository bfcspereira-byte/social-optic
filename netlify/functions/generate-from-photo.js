async function toBase64Image(urlOrDataUrl) {
  if (urlOrDataUrl.startsWith("data:")) {
    const match = urlOrDataUrl.match(/^data:([^;]+);base64,(.*)$/s);
    if (!match) throw new Error("Formato de imagem inválido.");
    return { mediaType: match[1], data: match[2] };
  }
  const res = await fetch(urlOrDataUrl);
  if (!res.ok) throw new Error(`Não consegui obter a imagem (${res.status})`);
  const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  const buf = await res.arrayBuffer();
  const base64 = Buffer.from(buf).toString("base64");
  return { mediaType: contentType, data: base64 };
}

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

  let body;
  try {
    body = await req.json();
    if (!body.imageUrl) throw new Error("Falta a fotografia.");
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Pedido inválido: " + (err?.message || String(err)) }), { status: 400 });
  }

  const { imageUrl, topic } = body;

  let image;
  try {
    image = await toBase64Image(imageUrl);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Não consegui ler a fotografia: " + (err?.message || String(err)) }), { status: 400 });
  }

  const prompt = `Es um especialista em marketing de redes sociais para óticas em Portugal. Escreves para a "Opticalia Felgueiras", uma ótica local, com tom próximo, claro e de confiança — sem exageros de vendedor.

Olha com atenção para a fotografia em anexo (armação, cor, estilo, contexto) e escreve uma publicação para Instagram/Facebook que descreva fielmente o que se vê na imagem.
${topic ? `Tópicos/orientação dados pelo lojista: ${topic}` : "O lojista não deu nenhum tópico específico — baseia-te só no que vês na fotografia."}

Não inventes preços, promoções ou características que não sejam visíveis ou indicadas.

Responde APENAS com um objeto JSON, sem markdown, sem texto antes ou depois, no formato:
{
  "titulo_interno": "título curto só para identificar o post na biblioteca",
  "legenda": "legenda pronta a publicar, em português de Portugal, com quebras de linha onde fizer sentido",
  "hashtags": ["#exemplo1", "#exemplo2"],
  "sugestao_visual": "breve nota sobre o que a foto já mostra bem, ou como enquadrá-la ao publicar",
  "cta": "frase final de chamada à ação (ex: visitar a loja, marcar consulta)"
}`;

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
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
              { type: "text", text: prompt },
            ],
          },
        ],
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
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    const parsed = JSON.parse(clean.slice(start, end + 1));

    return new Response(
      JSON.stringify({
        ok: true,
        titulo_interno: parsed.titulo_interno || "Publicação a partir de foto",
        legenda: parsed.legenda || "",
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        sugestao_visual: parsed.sugestao_visual || "",
        cta: parsed.cta || "",
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Erro no servidor: " + (err?.message || String(err)) }), { status: 500 });
  }
};
