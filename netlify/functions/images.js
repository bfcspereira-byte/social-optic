import { getStore } from "@netlify/blobs";

function store() {
  return getStore({ name: "optic-images", consistency: "strong" });
}

export default async (req) => {
  const s = store();
  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const { blobs } = await s.list();
      const images = await Promise.all(
        blobs.map(async (b) => await s.get(b.key, { type: "json" }))
      );
      const valid = images.filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return new Response(JSON.stringify({ ok: true, images: valid }), { status: 200 });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { filename, tags, dataUrl } = body;
      if (!dataUrl) {
        return new Response(JSON.stringify({ ok: false, error: "Falta a imagem" }), { status: 400 });
      }
      const id = "img_" + Date.now();
      const image = {
        id,
        filename: filename || "imagem",
        tags: Array.isArray(tags) ? tags.map((t) => t.toLowerCase().trim()).filter(Boolean) : [],
        dataUrl,
        createdAt: new Date().toISOString(),
      };
      await s.setJSON(id, image);
      return new Response(JSON.stringify({ ok: true, image }), { status: 200 });
    }

    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ ok: false, error: "Falta o id" }), { status: 400 });
      }
      await s.delete(id);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: false, error: "Método não permitido" }), { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Erro no servidor: " + (err?.message || String(err)) }), { status: 500 });
  }
};
