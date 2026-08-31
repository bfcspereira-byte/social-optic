export default async (req) => {
  const url = new URL(req.url);
  const query = url.searchParams.get("q");

  if (!query) {
    return new Response(JSON.stringify({ ok: false, error: "Falta o termo de pesquisa" }), { status: 400 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Falta configurar a chave UNSPLASH_ACCESS_KEY no Netlify." }),
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );
    const rawText = await response.text();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Erro Unsplash (${response.status}): ${rawText.slice(0, 300)}` }),
        { status: 502 }
      );
    }

    const data = JSON.parse(rawText);
    const results = (data.results || []).map((p) => ({
      id: p.id,
      thumb: p.urls.small,
      full: p.urls.regular,
      credit: p.user?.name || "Unsplash",
      creditUrl: p.user?.links?.html || "https://unsplash.com",
    }));
    return new Response(JSON.stringify({ ok: true, results }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Erro no servidor: " + (err?.message || String(err)) }), { status: 500 });
  }
};
