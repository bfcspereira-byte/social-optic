import React, { useState, useEffect, useRef } from "react";
import {
  Eye, Lock, Mail, User, LogOut, Sparkles, RefreshCw, Image as ImageIcon,
  Video, Check, X, Copy, ChevronRight, Glasses, Sun, Wrench, Shirt,
  Layers, Loader2, AlertCircle, Plus, Trash2
} from "lucide-react";

/* ---------------------------------------------------------
   TOKENS — paleta "Ótica Bruna" (bordô/creme)
   ink     #4A1E2A  — bordô escuro, texto e header
   cream   #FBF4EC  — fundo de cartão
   wine    #8B3A4B  — bordô vivo, ação primária
   amber   #F2A93B  — âmbar quente, destaque pontual
   mist    #E6D6C7  — bordas quentes
   sage    #5F7350  — estado "publicado"
--------------------------------------------------------- */

const CATEGORIES = [
  {
    id: "produto",
    label: "Apresentação de produto",
    icon: Glasses,
    hint: "Uma armação, uma marca, uma novidade em loja",
  },
  {
    id: "cuidados",
    label: "Dicas de cuidados",
    icon: Wrench,
    hint: "Manutenção de lentes, armações, higiene visual",
  },
  {
    id: "comparacao",
    label: "Comparação de qualidade",
    icon: Layers,
    hint: "Ex: lente de 100€ vs. lente de 500€ — porquê a diferença",
  },
  {
    id: "moda",
    label: "Moda e tendências",
    icon: Shirt,
    hint: "Estilos de armações, cores da estação, styling",
  },
];

const CATEGORY_PROMPTS = {
  produto:
    "Cria uma publicação de apresentação de produto para uma ótica. O objetivo é destacar um produto (armação, lente ou marca) de forma apelativa, gerando desejo de compra ou visita à loja, sem inventar preços ou promoções concretas.",
  cuidados:
    "Cria uma publicação com uma dica técnica de cuidados com óculos, lentes ou saúde visual, explicada de forma simples e útil para o público em geral, que mostre a competência técnica da ótica.",
  comparacao:
    "Cria uma publicação que explique, de forma acessível, a diferença real de qualidade entre gamas de produtos de ótica (ex: lentes económicas vs. lentes premium, ou armações de marca vs. genéricas). O objetivo é educar o cliente sobre porque vale a pena investir em qualidade, sem desvalorizar clientes com orçamento mais baixo.",
  moda:
    "Cria uma publicação sobre moda e tendências de armações/óculos, com um tom atual e visualmente inspirador, ligando estilo pessoal à escolha de óculos.",
};

// O armazenamento persistente (window.storage) está a devolver erro
// ("Unexpected response type") neste ambiente — confirmado por diagnóstico.
// Para a app funcionar já, guardamos contas e posts em memória, partilhados
// por todos os componentes enquanto o artifact estiver aberto. Isto reinicia
// se a página for recarregada; a versão real (Netlify) deve usar uma base
// de dados própria.
// Fora do Claude (site real no Netlify), o navegador tem localStorage
// disponível sem restrições — por isso contas e posts ficam guardados
// mesmo depois de fechar e reabrir a página.
function loadMap(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Map(JSON.parse(raw)) : new Map();
  } catch {
    return new Map();
  }
}
function saveMap(key, map) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(map.entries())));
  } catch {
    // Se o navegador bloquear localStorage (ex: modo privado), a app
    // continua a funcionar só dentro da sessão atual.
  }
}

const sessionAccounts = {
  _map: loadMap("optic_accounts"),
  get(key) { return this._map.get(key); },
  set(key, value) { this._map.set(key, value); saveMap("optic_accounts", this._map); },
};
const sessionPosts = {
  _map: loadMap("optic_posts"),
  get(key) { return this._map.get(key); },
  set(key, value) { this._map.set(key, value); saveMap("optic_posts", this._map); },
  delete(key) { this._map.delete(key); saveMap("optic_posts", this._map); },
  values() { return this._map.values(); },
};
let sessionListeners = [];
function notifyPostsChanged() {
  sessionListeners.forEach((fn) => fn());
}

function useStorageStatus() {
  const [status, setStatus] = useState("idle");
  return status;
}

async function callClaudeOnce(prompt) {
  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    return { ok: false, error: "FASE pedido de rede: " + (err?.message || String(err)) };
  }

  if (!response.ok) {
    let bodyText = "";
    try { bodyText = await response.text(); } catch {}
    return { ok: false, error: `FASE resposta HTTP ${response.status}: ${bodyText.slice(0, 200)}` };
  }

  let rawText = "";
  try {
    rawText = await response.text();
  } catch (err) {
    return { ok: false, error: "FASE leitura do corpo: " + (err?.message || String(err)) };
  }

  if (!rawText || rawText.trim().length === 0) {
    return { ok: false, error: "corpo vazio" };
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (err) {
    return {
      ok: false,
      error: "FASE parse do JSON: " + (err?.message || String(err)) +
        " | Corpo recebido: " + rawText.slice(0, 300),
    };
  }

  try {
    const text = data.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: "FASE leitura do conteúdo: " + (err?.message || String(err)) };
  }
}

async function callClaude(prompt) {
  let lastError = "erro desconhecido";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await callClaudeOnce(prompt);
    if (result.ok) return result.text;
    lastError = result.error;
    if (lastError !== "corpo vazio") break; // só repetimos em caso de corpo vazio
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  throw new Error(lastError + " (após novas tentativas)");
}

function extractJson(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  return JSON.parse(clean.slice(start, end + 1));
}

/* ---------------------------------------------------------
   LOGIN
--------------------------------------------------------- */
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFocused(true), 150);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password || (mode === "criar" && !name)) {
      setError("Preenche todos os campos.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));

    const key = email.toLowerCase();
    const existing = sessionAccounts.get(key);

    if (mode === "entrar") {
      if (!existing) {
        setError("Não encontrámos essa conta nesta sessão. Cria uma nova, é rápido.");
        setLoading(false);
        return;
      }
      if (existing.password !== password) {
        setError("Palavra-passe incorreta.");
        setLoading(false);
        return;
      }
      onLogin(existing);
    } else {
      if (existing) {
        setError("Já existe uma conta com este email nesta sessão.");
        setLoading(false);
        return;
      }
      const user = { name, email: key, password };
      sessionAccounts.set(key, user);
      onLogin(user);
    }
    setLoading(false);
  }

  return (
    <div
      style={{ background: "#4A1E2A" }}
      className="min-h-screen w-full flex items-center justify-center px-6 relative overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: 520,
          height: 520,
          border: "1px solid rgba(196,208,220,0.15)",
          top: "-120px",
          right: "-160px",
          filter: focused ? "blur(0px)" : "blur(14px)",
          opacity: focused ? 1 : 0.5,
          transition: "filter 1.1s ease, opacity 1.1s ease",
        }}
      />
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: 300,
          height: 300,
          border: "1px solid rgba(63,167,214,0.25)",
          bottom: "-100px",
          left: "-80px",
          filter: focused ? "blur(0px)" : "blur(20px)",
          transition: "filter 1.3s ease",
        }}
      />

      <div className="w-full max-w-sm relative">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{
              border: "1.5px solid #8B3A4B",
              filter: focused ? "blur(0px)" : "blur(6px)",
              transition: "filter 0.9s ease",
            }}
          >
            <Eye size={20} color="#8B3A4B" strokeWidth={1.75} />
          </div>
          <div>
            <div
              style={{ fontFamily: "Fraunces, serif", color: "#FBF4EC" }}
              className="text-xl leading-none"
            >
              Optic
            </div>
            <div style={{ color: "#B0A196" }} className="text-[11px] tracking-wide leading-none mt-1">
              Opticalia Felgueiras
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-7"
          style={{ background: "#FBF4EC" }}
        >
          <h1
            style={{ fontFamily: "Fraunces, serif", color: "#4A1E2A" }}
            className="text-2xl mb-1"
          >
            {mode === "entrar" ? "Entrar" : "Criar conta de equipa"}
          </h1>
          <p style={{ color: "#8C7A6E" }} className="text-sm mb-6">
            {mode === "entrar"
              ? "Acede à biblioteca de conteúdos da loja."
              : "Junta-te à equipa que gere as redes da loja."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "criar" && (
              <div className="relative">
                <User size={16} className="absolute left-3 top-3.5" color="#B0A196" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="O teu nome"
                  className="w-full pl-9 pr-3 py-3 rounded-lg text-sm outline-none"
                  style={{ background: "#fff", border: "1px solid #E6D6C7", color: "#4A1E2A" }}
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3.5" color="#B0A196" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full pl-9 pr-3 py-3 rounded-lg text-sm outline-none"
                style={{ background: "#fff", border: "1px solid #E6D6C7", color: "#4A1E2A" }}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3.5" color="#B0A196" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Palavra-passe"
                className="w-full pl-9 pr-3 py-3 rounded-lg text-sm outline-none"
                style={{ background: "#fff", border: "1px solid #E6D6C7", color: "#4A1E2A" }}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm" style={{ color: "#C24444" }}>
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-medium mt-2 flex items-center justify-center gap-2 transition-opacity"
              style={{ background: "#8B3A4B", color: "#FBF4EC", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === "entrar" ? "criar" : "entrar");
              setError("");
            }}
            className="w-full text-center text-sm mt-5"
            style={{ color: "#8C7A6E" }}
          >
            {mode === "entrar" ? (
              <>Ainda sem conta? <span style={{ color: "#8B3A4B" }}>Criar conta de equipa</span></>
            ) : (
              <>Já tens conta? <span style={{ color: "#8B3A4B" }}>Entrar</span></>
            )}
          </button>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "#8C7A6E" }}>
          Cada pessoa da equipa entra com a sua própria conta neste dispositivo
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   GERADOR DE CONTEÚDO
--------------------------------------------------------- */
function Generator({ user, onSaved, initialCategory }) {
  const [category, setCategory] = useState(initialCategory || null);
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [media, setMedia] = useState([]);
  const [platform, setPlatform] = useState({ instagram: true, facebook: true });
  const fileRef = useRef(null);

  async function generate() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const prompt = `Es um especialista em marketing de redes sociais para óticas em Portugal. Escreves para a "Opticalia Felgueiras", uma ótica local, com tom próximo, claro e de confiança — sem exageros de vendedor.

${CATEGORY_PROMPTS[category]}
${detail ? `Detalhe pedido pelo lojista: ${detail}` : ""}

Responde APENAS com um objeto JSON, sem markdown, sem texto antes ou depois, no formato:
{
  "titulo_interno": "título curto só para identificar o post na biblioteca",
  "legenda": "legenda pronta a publicar, em português de Portugal, com quebras de linha onde fizer sentido",
  "hashtags": ["#exemplo1", "#exemplo2"],
  "sugestao_visual": "descrição curta do tipo de imagem ou vídeo que o lojista deve usar",
  "cta": "frase final de chamada à ação (ex: visitar a loja, marcar consulta)"
}`;
      const text = await callClaude(prompt);
      const json = extractJson(text);
      setResult(json);
    } catch (err) {
      setError("Não consegui gerar o conteúdo agora. Detalhe técnico: " + (err?.message || String(err)));
    }
    setLoading(false);
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    const items = files.map((f) => ({
      name: f.name,
      type: f.type.startsWith("video") ? "video" : "image",
      url: URL.createObjectURL(f),
    }));
    setMedia((m) => [...m, ...items]);
  }

  async function saveToLibrary(status) {
    if (!result) return;
    const id = "post_" + Date.now();
    const post = {
      id,
      category,
      status, // "rascunho" | "pronto"
      author: user.name,
      createdAt: new Date().toISOString(),
      platform,
      mediaNames: media.map((m) => m.name),
      ...result,
    };
    sessionPosts.set(id, post);
    notifyPostsChanged();
    onSaved(post);
    setResult(null);
    setCategory(null);
    setDetail("");
    setMedia([]);
  }

  if (!category) {
    return (
      <div>
        <h2 style={{ fontFamily: "Fraunces, serif", color: "#4A1E2A" }} className="text-xl mb-1">
          O que precisas de publicar hoje?
        </h2>
        <p style={{ color: "#8C7A6E" }} className="text-sm mb-6">
          Escolhe um tipo de conteúdo — a IA prepara o texto, tu só juntas as imagens.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className="text-left p-5 rounded-xl transition-all group"
                style={{ background: "#fff", border: "1px solid #E6D6C7" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#8B3A4B")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E6D6C7")}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center mb-3"
                  style={{ background: "#F3E3D3" }}
                >
                  <Icon size={17} color="#8B3A4B" strokeWidth={1.75} />
                </div>
                <div style={{ color: "#4A1E2A" }} className="text-sm font-medium mb-1">
                  {c.label}
                </div>
                <div style={{ color: "#B0A196" }} className="text-xs leading-snug">
                  {c.hint}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const cat = CATEGORIES.find((c) => c.id === category);

  return (
    <div>
      <button
        onClick={() => { setCategory(null); setResult(null); setError(""); }}
        className="text-sm mb-5 flex items-center gap-1"
        style={{ color: "#8C7A6E" }}
      >
        ← Escolher outro tipo
      </button>

      <div className="flex items-center gap-2 mb-4">
        <cat.icon size={18} color="#8B3A4B" />
        <h2 style={{ fontFamily: "Fraunces, serif", color: "#4A1E2A" }} className="text-lg">
          {cat.label}
        </h2>
      </div>

      {!result && (
        <div className="rounded-xl p-5 mb-4" style={{ background: "#fff", border: "1px solid #E6D6C7" }}>
          <label style={{ color: "#8C7A6E" }} className="text-xs block mb-2">
            Algum detalhe para orientar a IA? (opcional — ex: nome de marca, tipo de armação)
          </label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={2}
            className="w-full p-3 rounded-lg text-sm outline-none resize-none"
            style={{ background: "#FBF4EC", border: "1px solid #E6D6C7", color: "#4A1E2A" }}
            placeholder="Ex: lentes progressivas Essilor, armações Ray-Ban de sol..."
          />
          <button
            onClick={generate}
            disabled={loading}
            className="mt-3 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ background: "#4A1E2A", color: "#FBF4EC", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "A gerar conteúdo..." : "Gerar publicação"}
          </button>
          {error && (
            <div className="flex items-center gap-2 text-sm mt-3" style={{ color: "#C24444" }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-xl p-5 mb-4" style={{ background: "#fff", border: "1px solid #E6D6C7" }}>
          <div className="flex items-center justify-between mb-4">
            <span style={{ color: "#B0A196" }} className="text-xs uppercase tracking-wide">
              {result.titulo_interno}
            </span>
            <button
              onClick={generate}
              className="text-xs flex items-center gap-1"
              style={{ color: "#8B3A4B" }}
            >
              <RefreshCw size={12} /> Gerar outra versão
            </button>
          </div>

          <div className="mb-4">
            <div style={{ color: "#8C7A6E" }} className="text-xs mb-1.5">Legenda</div>
            <div
              className="p-3 rounded-lg text-sm whitespace-pre-wrap"
              style={{ background: "#FBF4EC", color: "#4A1E2A", lineHeight: 1.6 }}
            >
              {result.legenda}
            </div>
          </div>

          <div className="mb-4">
            <div style={{ color: "#8C7A6E" }} className="text-xs mb-1.5">Hashtags</div>
            <div className="flex flex-wrap gap-1.5">
              {(result.hashtags || []).map((h, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: "#F3E3D3", color: "#6B2A3D" }}
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div style={{ color: "#8C7A6E" }} className="text-xs mb-1.5">Sugestão visual</div>
            <div className="text-sm" style={{ color: "#4A1E2A" }}>{result.sugestao_visual}</div>
          </div>

          <div className="mb-5">
            <div style={{ color: "#8C7A6E" }} className="text-xs mb-1.5">Chamada à ação</div>
            <div className="text-sm font-medium" style={{ color: "#6B2A3D" }}>{result.cta}</div>
          </div>

          <div className="mb-5 pt-4" style={{ borderTop: "1px solid #EBDCCC" }}>
            <div style={{ color: "#8C7A6E" }} className="text-xs mb-2">As tuas imagens ou vídeos</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {media.map((m, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ border: "1px solid #E6D6C7" }}>
                  {m.type === "image" ? (
                    <img src={m.url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "#F3E3D3" }}>
                      <Video size={16} color="#8B3A4B" />
                    </div>
                  )}
                  <button
                    onClick={() => setMedia(media.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(16,35,63,0.7)" }}
                  >
                    <X size={10} color="#fff" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-16 h-16 rounded-lg flex items-center justify-center"
                style={{ border: "1.5px dashed #E6D6C7" }}
              >
                <Plus size={16} color="#B0A196" />
              </button>
              <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFiles} />
            </div>
          </div>

          <div className="flex items-center gap-4 mb-5">
            {["instagram", "facebook"].map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#4A1E2A" }}>
                <input
                  type="checkbox"
                  checked={platform[p]}
                  onChange={() => setPlatform((pl) => ({ ...pl, [p]: !pl[p] }))}
                />
                {p === "instagram" ? "Instagram" : "Facebook"}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => saveToLibrary("pronto")}
              className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{ background: "#8B3A4B", color: "#FBF4EC" }}
            >
              <Check size={15} /> Guardar como pronto a publicar
            </button>
            <button
              onClick={() => saveToLibrary("rascunho")}
              className="px-4 py-2.5 rounded-lg text-sm"
              style={{ background: "#FBF4EC", color: "#8C7A6E", border: "1px solid #E6D6C7" }}
            >
              Guardar como rascunho
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   BIBLIOTECA
--------------------------------------------------------- */
function Library({ refreshKey }) {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("todos");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    load();
    const listener = () => load();
    sessionListeners.push(listener);
    return () => {
      sessionListeners = sessionListeners.filter((l) => l !== listener);
    };
  }, [refreshKey]);

  function load() {
    const valid = Array.from(sessionPosts.values()).sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );
    setPosts(valid);
  }

  function markPublished(post) {
    sessionPosts.set(post.id, { ...post, status: "publicado" });
    notifyPostsChanged();
  }

  function remove(post) {
    sessionPosts.delete(post.id);
    notifyPostsChanged();
  }

  function copyCaption(post) {
    const text = `${post.legenda}\n\n${(post.hashtags || []).join(" ")}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const filtered = filter === "todos" ? posts : posts.filter((p) => p.status === filter);
  const statusColor = { rascunho: "#B0A196", pronto: "#8B3A4B", publicado: "#5F7350" };
  const statusLabel = { rascunho: "Rascunho", pronto: "Pronto a publicar", publicado: "Publicado" };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 style={{ fontFamily: "Fraunces, serif", color: "#4A1E2A" }} className="text-xl">
          Biblioteca de conteúdos
        </h2>
        <div className="flex gap-1.5">
          {["todos", "rascunho", "pronto", "publicado"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="text-xs px-2.5 py-1.5 rounded-full"
              style={{
                background: filter === f ? "#4A1E2A" : "#fff",
                color: filter === f ? "#FBF4EC" : "#8C7A6E",
                border: "1px solid #E6D6C7",
              }}
            >
              {f === "todos" ? "Todos" : statusLabel[f]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 rounded-xl" style={{ background: "#fff", border: "1px dashed #E6D6C7" }}>
          <Eye size={22} color="#E6D6C7" className="mx-auto mb-3" />
          <p style={{ color: "#B0A196" }} className="text-sm">Ainda não há conteúdo aqui.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((post) => {
          const cat = CATEGORIES.find((c) => c.id === post.category);
          return (
            <div key={post.id} className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid #E6D6C7" }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {cat && <cat.icon size={14} color="#8B3A4B" />}
                  <span style={{ color: "#4A1E2A" }} className="text-sm font-medium">{post.titulo_interno}</span>
                </div>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: statusColor[post.status] + "20", color: statusColor[post.status] }}
                >
                  {statusLabel[post.status]}
                </span>
              </div>
              <p style={{ color: "#8C7A6E" }} className="text-sm mb-3 line-clamp-2">{post.legenda}</p>
              <div className="flex items-center justify-between">
                <span style={{ color: "#B0A196" }} className="text-[11px]">
                  {post.author} · {new Date(post.createdAt).toLocaleDateString("pt-PT")}
                </span>
                <div className="flex items-center gap-3">
                  <button onClick={() => copyCaption(post)} className="text-xs flex items-center gap-1" style={{ color: "#8B3A4B" }}>
                    <Copy size={12} /> {copiedId === post.id ? "Copiado" : "Copiar texto"}
                  </button>
                  {post.status !== "publicado" && (
                    <button onClick={() => markPublished(post)} className="text-xs flex items-center gap-1" style={{ color: "#5F7350" }}>
                      <Check size={12} /> Marcar publicado
                    </button>
                  )}
                  <button onClick={() => remove(post)} className="text-xs" style={{ color: "#C24444" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   DASHBOARD
--------------------------------------------------------- */
function Dashboard({ user, onCreate, onOpenCategory, refreshKey, onOpenLibrary }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const load = () =>
      setPosts(Array.from(sessionPosts.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    load();
    sessionListeners.push(load);
    return () => { sessionListeners = sessionListeners.filter((l) => l !== load); };
  }, [refreshKey]);

  const publicados = posts.filter((p) => p.status === "publicado").length;
  const prontos = posts.filter((p) => p.status === "pronto").length;
  const rascunhos = posts.filter((p) => p.status === "rascunho").length;
  const proxima = posts.find((p) => p.status === "pronto") || posts[0];

  const hora = new Date().getHours();
  const saudacao = hora < 13 ? "Bom dia" : hora < 20 ? "Boa tarde" : "Boa noite";

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <div style={{ color: "#B0A196" }} className="text-xs tracking-widest uppercase mb-2">
            Opticalia Felgueiras
          </div>
          <h1 style={{ fontFamily: "Fraunces, serif", color: "#4A1E2A" }} className="text-3xl mb-1">
            {saudacao}, {user.name.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "#8C7A6E" }} className="text-sm">Vamos criar algo incrível hoje?</p>
        </div>
        <div
          className="w-14 h-14 rounded-full shrink-0"
          style={{ background: "linear-gradient(135deg, #8B3A4B, #F2A93B, #4A1E2A)" }}
        />
      </div>

      <div style={{ color: "#4A1E2A" }} className="text-sm font-medium mb-3">Esta semana</div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Publicações", value: publicados },
          { label: "Prontas", value: prontos },
          { label: "Rascunhos", value: rascunhos },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: "#FBF4EC" }}>
            <div style={{ fontFamily: "Fraunces, serif", color: "#4A1E2A" }} className="text-3xl mb-1">
              {s.value}
            </div>
            <div style={{ color: "#8C7A6E" }} className="text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onCreate}
        className="w-full py-4 rounded-full text-sm font-medium mb-8 flex items-center justify-center gap-2"
        style={{ background: "#8B3A4B", color: "#FBF4EC" }}
      >
        <Plus size={16} /> Criar conteúdo
      </button>

      {proxima && (
        <>
          <div style={{ color: "#4A1E2A" }} className="text-sm font-medium mb-3">Próxima publicação</div>
          <div className="rounded-2xl p-4 mb-8" style={{ background: "#FBF4EC" }}>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[11px] px-2 py-0.5 rounded-full uppercase tracking-wide"
                style={{
                  background: proxima.status === "publicado" ? "#DCE3C8" : "#F3E3D3",
                  color: proxima.status === "publicado" ? "#5F7350" : "#6B2A3D",
                }}
              >
                {proxima.status === "pronto" ? "Pronto a publicar" : proxima.status === "publicado" ? "Publicado" : "Rascunho"}
              </span>
            </div>
            <p style={{ color: "#4A1E2A" }} className="text-sm mb-3 line-clamp-2">{proxima.legenda}</p>
            <button
              onClick={onOpenLibrary}
              className="text-xs font-medium"
              style={{ color: "#8B3A4B" }}
            >
              Ver na biblioteca →
            </button>
          </div>
        </>
      )}

      <div className="flex items-center justify-between mb-3">
        <div style={{ color: "#4A1E2A" }} className="text-sm font-medium">Sugestões para hoje</div>
      </div>
      <div className="space-y-2">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => onOpenCategory(c.id)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left"
              style={{ background: "#FBF4EC" }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#F3E3D3" }}>
                <Icon size={16} color="#8B3A4B" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div style={{ color: "#4A1E2A" }} className="text-sm font-medium">{c.label}</div>
                <div style={{ color: "#B0A196" }} className="text-xs truncate">{c.hint}</div>
              </div>
              <ChevronRight size={15} color="#B0A196" className="ml-auto shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   APP
--------------------------------------------------------- */
export default function OpticApp() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [presetCategory, setPresetCategory] = useState(null);
  const [generatorSeed, setGeneratorSeed] = useState(0);

  function goToGenerator(category) {
    setPresetCategory(category || null);
    setGeneratorSeed((s) => s + 1);
    setTab("gerar");
  }

  const fontLink = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Public+Sans:wght@400;500;600&display=swap');
      * { font-family: 'Public Sans', sans-serif; }
    `}</style>
  );

  if (!user) {
    return (
      <>
        {fontLink}
        <LoginScreen onLogin={setUser} />
      </>
    );
  }

  return (
    <>
      {fontLink}
      <div style={{ background: "#F4E9DE", minHeight: "100vh" }}>
        <header
          className="flex items-center justify-between px-6 py-4"
          style={{ background: "#4A1E2A" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ border: "1.5px solid #8B3A4B" }}>
              <Eye size={15} color="#8B3A4B" />
            </div>
            <div>
              <div style={{ fontFamily: "Fraunces, serif", color: "#FBF4EC" }} className="text-sm leading-none">Optic</div>
              <div style={{ color: "#B0A196" }} className="text-[10px] leading-none mt-0.5">Opticalia Felgueiras</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span style={{ color: "#E6D6C7" }} className="text-sm hidden sm:inline">{user.name}</span>
            <button onClick={() => setUser(null)} style={{ color: "#B0A196" }} className="flex items-center gap-1.5 text-sm">
              <LogOut size={14} /> Sair
            </button>
          </div>
        </header>

        <nav className="flex gap-1 px-6 pt-4 max-w-3xl mx-auto">
          {[
            { id: "dashboard", label: "Início", icon: Eye },
            { id: "gerar", label: "Gerar conteúdo", icon: Sparkles },
            { id: "biblioteca", label: "Biblioteca", icon: Layers },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === "gerar") goToGenerator(null);
                else setTab(t.id);
                setRefreshKey((k) => k + 1);
              }}
              className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-t-lg"
              style={{
                background: tab === t.id ? "#F4E9DE" : "transparent",
                color: tab === t.id ? "#4A1E2A" : "#B0A196",
                fontWeight: tab === t.id ? 600 : 400,
              }}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </nav>

        <main className="max-w-3xl mx-auto px-6 pb-16 pt-2">
          {tab === "dashboard" && (
            <Dashboard
              user={user}
              refreshKey={refreshKey}
              onCreate={() => goToGenerator(null)}
              onOpenCategory={(id) => goToGenerator(id)}
              onOpenLibrary={() => { setTab("biblioteca"); setRefreshKey((k) => k + 1); }}
            />
          )}
          {tab === "gerar" && (
            <Generator
              key={generatorSeed}
              user={user}
              initialCategory={presetCategory}
              onSaved={() => { setTab("dashboard"); setRefreshKey((k) => k + 1); }}
            />
          )}
          {tab === "biblioteca" && <Library refreshKey={refreshKey} />}
        </main>
      </div>
    </>
  );
}
