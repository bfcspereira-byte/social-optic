import { getStore } from "@netlify/blobs";

const CATEGORY_LABELS = {
  produto: "Apresentação de produto",
  cuidados: "Dicas de cuidados",
  comparacao: "Comparação de qualidade",
  moda: "Moda e tendências",
  video: "Vídeo explicativo",
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
    const recent = valid.slice(0, 15).map((p) => ({
      category: p.category,
      status: p.status,
      createdAt: p.createdAt,
      titulo: p.titulo_interno,
    }));

    const hoje = new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });

    const prompt = `És o gestor de redes sociais da "Opticalia Felgueiras", uma ótica local em Portugal. É como se fosses tu, todos os dias, a decidir o que a loja deve publicar a seguir — não um consultor genérico a listar categorias.

Hoje é ${hoje}.

Histórico recente de publicações (mais recente primeiro, pode estar vazio): ${JSON.stringify(recent)}.

As categorias possíveis são: produto (apresentação de produto), cuidados (dicas de cuidados), comparacao (comparação de qualidade entre gamas de produtos), moda (moda e tendências), video (vídeo explicativo).

Pensa como um verdadeiro gestor de página faria: considera a época do ano (regresso às aulas, verão, Natal, dia dos namorados, etc., conforme a data de hoje), o que já foi publicado recentemente (evita repetir o mesmo ângulo), e o que realmente prende a atenção de clientes de uma ótica local. Sugere as 3 próximas publicações a criar.

Para cada sugestão, dá:
- "category": uma das categorias acima
- "topic": a ideia CONCRETA e específica da publicação, como se estivesses a explicar a um colega o que fotografar/escrever — nunca genérico. Ex: "Mostra o contraste entre uma lente antirreflexo e uma normal com luz de trás, aproveitando o sol forte desta semana" em vez de "fala sobre lentes". Máx. 20 palavras.
- "reason": porque faz sentido publicar isto agora (máx. 12 palavras) — pode referir a época do ano, um vazio no calendário de publicações, etc.

Responde APENAS com um objeto JSON, sem markdown, sem texto antes ou depois, no formato:
{"suggestions": [{"category": "produto", "topic": "...", "reason": "..."}, {"category": "...", "topic": "...", "reason": "..."}, {"category": "...", "topic": "...", "reason": "..."}]}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
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
      topic: s.topic,
      reason: s.reason,
    }));

    return new Response(JSON.stringify({ ok: true, suggestions }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Erro no servidor: " + (err?.message || String(err)) }), { status: 500 });
  }
};

