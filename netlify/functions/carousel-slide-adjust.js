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
    if (!body.imageUrl) throw new Error("Falta a imagem.");
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Pedido inválido: " + (err?.message || String(err)) }), { status: 400 });
  }

  const { imageUrl, topic, headline, subheadline, bullets, isCta } = body;

  let image;
  try {
    image = await toBase64Image(imageUrl);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Não consegui ler a imagem: " + (err?.message || String(err)) }), { status: 400 });
  }

  const prompt = `Estás a rever um slide de um carrossel de Instagram para a ótica "Opticalia Felgueiras", sobre o tema geral "${topic || "óculos"}".

Este slide tinha o seguinte texto, escrito ANTES de se escolher a foto:
- Título: "${headline || ""}"
- Subtítulo: "${subheadline || ""}"
- Tópicos: ${JSON.stringify(bullets || [])}
${isCta ? "- Este é o último slide (chamada à ação)." : ""}

Olha com atenção para a foto em anexo e corrige o texto para ser fiel ao que realmente aparece na imagem (tipo de armação — ex: metal fino, acetato grosso/de massa, redonda, quadrada —, cor, estilo, género da pessoa se aplicável). Mantém o mesmo tema geral e o mesmo tom (próximo, claro, sem gíria de vendedor), e mantém aproximadamente o mesmo comprimento do texto original. Não inventes preços ou promoções.

Responde APENAS com um objeto JSON, sem markdown, sem texto antes ou depois, no formato:
{"headline": "...", "subheadline": "...", "bullets": ["..."]}`;

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
        max_tokens: 600,
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
        headline: parsed.headline || headline,
        subheadline: parsed.subheadline || subheadline,
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 3) : (bullets || []),
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Erro no servidor: " + (err?.message || String(err)) }), { status: 500 });
  }
};
