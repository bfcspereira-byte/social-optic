import { getStore } from "@netlify/blobs";

function store() {
  return getStore({ name: "optic-settings", consistency: "strong" });
}

function mask(value) {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return "•".repeat(Math.max(0, value.length - 4)) + value.slice(-4);
}

// CRUD genérico para guardar chaves/segredos usados pela app (ex: chave da
// API do HeyGen), para não ser preciso mexer nas variáveis de ambiente do
// Netlify sempre que se quer trocar uma chave. Guardado em Netlify Blobs.
export default async (req) => {
  const s = store();
  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const { blobs } = await s.list();
      const entries = await Promise.all(
        blobs.map(async (b) => {
          const value = await s.get(b.key, { type: "text" });
          return { key: b.key, hasValue: !!value, masked: mask(value) };
        })
      );
      return new Response(JSON.stringify({ ok: true, settings: entries }), { status: 200 });
    }

    if (req.method === "POST") {
      const { key, value } = await req.json();
      if (!key || !value) {
        return new Response(JSON.stringify({ ok: false, error: "Falta a chave ou o valor" }), { status: 400 });
      }
      await s.set(key, value);
      return new Response(JSON.stringify({ ok: true, key, masked: mask(value) }), { status: 200 });
    }

    if (req.method === "DELETE") {
      const key = url.searchParams.get("key");
      if (!key) {
        return new Response(JSON.stringify({ ok: false, error: "Falta o nome da chave" }), { status: 400 });
      }
      await s.delete(key);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: false, error: "Método não permitido" }), { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Erro no servidor: " + (err?.message || String(err)) }), { status: 500 });
  }
};
