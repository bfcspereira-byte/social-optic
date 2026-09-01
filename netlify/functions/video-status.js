import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return new Response(JSON.stringify({ ok: false, error: "Falta o session_id" }), { status: 400 });
  }

  const settingsStore = getStore({ name: "optic-settings", consistency: "strong" });
  const heygenApiKey = await settingsStore.get("heygenApiKey", { type: "text" });
  if (!heygenApiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Falta configurar a chave da API do HeyGen. Vai a Definições e adiciona a tua chave." }),
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(sessionId)}`,
      { headers: { "X-Api-Key": heygenApiKey } }
    );
    const rawText = await response.text();
    if (!response.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Erro do HeyGen (${response.status}): ${rawText.slice(0, 300)}` }),
        { status: 502 }
      );
    }

    const data = JSON.parse(rawText);
    const info = data?.data;
    if (!info) {
      return new Response(JSON.stringify({ ok: false, error: "Resposta inesperada do HeyGen." }), { status: 502 });
    }

    // A app espera as fases: "scripting" | "processing" | "completed" | "failed"
    const statusMap = {
      pending: "scripting",
      waiting: "scripting",
      processing: "processing",
      completed: "completed",
      failed: "failed",
    };

    return new Response(
      JSON.stringify({
        ok: true,
        status: statusMap[info.status] || info.status,
        videoUrl: info.video_url || null,
        error: info.error || null,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Erro no servidor ao ligar ao HeyGen: " + (err?.message || String(err)) }),
      { status: 500 }
    );
  }
};
