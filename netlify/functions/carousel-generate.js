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

  let topic;
  try {
    const body = await req.json();
    topic = body.topic;
    if (!topic) throw new Error("Falta o campo 'topic'");
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Pedido inválido: " + (err?.message || String(err)) }), { status: 400 });
  }

  const prompt = `Es um especialista em marketing de redes sociais para uma ótica local em Portugal ("Opticalia Felgueiras"). Vais preparar o guião de um carrossel de Instagram (várias imagens/slides, deslizadas pelo utilizador) sobre o seguinte tema: "${topic}".

Decide tu quantos slides o tema justifica — normalmente entre 4 e 7, nunca mais de 8. Usa o mínimo de slides que conte a história de forma completa e não repetitiva; não estiques o tema artificialmente.

Regras para cada slide:
- "number": número do slide como texto com dois dígitos ("01", "02", ...), ou null se for o último slide (chamada à ação).
- "headline": frase curta e impactante (máx. 6-8 palavras), o que vai a negrito no ecrã.
- "subheadline": 1 frase curta de apoio (máx. 18 palavras), tom próximo e claro, sem gíria de vendedor.
- "bullets": lista de 0 a 3 frases muito curtas (máx. 5 palavras cada) só quando fizer sentido resumir pontos-chave nesse slide; caso contrário lista vazia.
- "isCta": true apenas no último slide, que deve ser uma chamada à ação simples para visitar a Opticalia Felgueiras (sem inventar promoções ou preços concretos).

Responde APENAS com um objeto JSON, sem markdown, sem texto antes ou depois, no formato:
{"slides": [{"number": "01", "headline": "...", "subheadline": "...", "bullets": [], "isCta": false}, ...]}`;

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
        max_tokens: 1400,
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
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    const parsed = JSON.parse(clean.slice(start, end + 1));

    const slides = (parsed.slides || []).map((s, i) => ({
      id: "slide_" + i,
      number: s.number || null,
      headline: s.headline || "",
      subheadline: s.subheadline || "",
      bullets: Array.isArray(s.bullets) ? s.bullets.slice(0, 3) : [],
      isCta: !!s.isCta,
    }));

    if (slides.length === 0) throw new Error("Não recebi nenhum slide do modelo.");

    return new Response(JSON.stringify({ ok: true, slides }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Erro no servidor: " + (err?.message || String(err)) }), { status: 500 });
  }
};
