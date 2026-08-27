import { getStore } from "@netlify/blobs";

function store() {
  return getStore({ name: "optic-posts", consistency: "strong" });
}

export default async (req) => {
  const s = store();
  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const { blobs } = await s.list();
      const posts = await Promise.all(
        blobs.map(async (b) => await s.get(b.key, { type: "json" }))
      );
      const valid = posts.filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return new Response(JSON.stringify({ ok: true, posts: valid }), { status: 200 });
    }

    if (req.method === "POST") {
      const post = await req.json();
      const id = post.id || "post_" + Date.now();
      const toSave = { ...post, id };
      await s.setJSON(id, toSave);
      return new Response(JSON.stringify({ ok: true, post: toSave }), { status: 200 });
    }

    if (req.method === "PATCH") {
      const { id, status } = await req.json();
      const existing = await s.get(id, { type: "json" });
      if (!existing) {
        return new Response(JSON.stringify({ ok: false, error: "Post não encontrado" }), { status: 404 });
      }
      const updated = { ...existing, status };
      await s.setJSON(id, updated);
      return new Response(JSON.stringify({ ok: true, post: updated }), { status: 200 });
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
