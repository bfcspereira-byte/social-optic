import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método não permitido" }), { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Pedido inválido" }), { status: 400 });
  }

  const { action, email, password, name } = body || {};
  if (!email || !password || (action === "signup" && !name)) {
    return new Response(JSON.stringify({ ok: false, error: "Faltam dados" }), { status: 400 });
  }

  const store = getStore({ name: "optic-accounts", consistency: "strong" });
  const key = email.toLowerCase().trim();

  try {
    const existing = await store.get(key, { type: "json" });

    if (action === "login") {
      if (!existing) {
        return new Response(JSON.stringify({ ok: false, error: "Não encontrámos essa conta. Cria uma nova." }), { status: 404 });
      }
      if (existing.password !== password) {
        return new Response(JSON.stringify({ ok: false, error: "Palavra-passe incorreta." }), { status: 401 });
      }
      return new Response(JSON.stringify({ ok: true, user: { name: existing.name, email: key } }), { status: 200 });
    }

    if (action === "signup") {
      if (existing) {
        return new Response(JSON.stringify({ ok: false, error: "Já existe uma conta com este email." }), { status: 409 });
      }
      const user = { name, email: key, password };
      await store.setJSON(key, user);
      return new Response(JSON.stringify({ ok: true, user: { name, email: key } }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: false, error: "Ação desconhecida" }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Erro no servidor: " + (err?.message || String(err)) }), { status: 500 });
  }
};
