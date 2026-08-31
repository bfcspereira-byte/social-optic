import { getStore } from "@netlify/blobs";

const CATEGORY_LABELS = {
  produto: "Apresentação de produto",
  cuidados: "Dicas de cuidados",
  comparacao: "Comparação de qualidade",
  moda: "Moda e tendências",
};

export default async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Falta configurar a chave ANTHROPIC_API_KEY no Netlify." }),
      { status: 500 }
    );
  }

  try {
    const s = getStore({ name: "optic-posts", consistency: "strong" });
    const { blobs } = await s.list();
    const posts = await Promise.all(blobs.map(async (b) => await s.get(b.key, { type: "json" })));
    const valid = posts.filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const recent = valid.slice(0, 15).map((p) => ({ category: p.category, status: p.status, createdAt: p.createdAt }));

    const prompt = `Es um consultor de marketing de redes sociais para uma ótica local. Aqui está o histórico recente de publicações (mais recente primeiro): ${JSON.stringify(recent)}.

As categorias possíveis são: produto (apresentação de produto), cuidados (dicas de cuidados), comparacao (comparação de qualidade entre gamas de produtos), moda (moda e tendências), e video (vídeo explicativo).

Analisa o equilíbrio do conteúdo recente (que tipos têm sido usados a mais ou a menos, há quanto tempo não se publica de cada tipo) e sugere as 3 próximas publicações a criar, para manter a página interessante e variada. Para cada sugestão, dá uma categoria (uma das acima) e uma razão curta (máx. 15 palavras) e concreta.

Responde APENAS com um objeto JSON, sem markdown, sem texto antes ou depois, no formato:
{"suggestions": [{"category": "produto", "reason": "..."}, {"category": "...", "reason": "..."}, {"category": "...", "reason": "..."}]}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
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

    const suggestions = (parsed.suggestions || []).map((s) => ({
      category: s.category,
      label: CATEGORY_LABELS[s.category] || s.category,
      reason: s.reason,
    }));

    return new Response(JSON.stringify({ ok: true, suggestions }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Erro no servidor: " + (err?.message || String(err)) }), { status: 500 });
  }
};
