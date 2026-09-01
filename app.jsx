import React, { useState, useEffect, useRef } from "react";
import {
  Eye, Lock, Mail, User, LogOut, Sparkles, RefreshCw, Image as ImageIcon,
  Video, Check, X, Copy, ChevronRight, Glasses, Sun, Wrench, Shirt,
  Layers, Loader2, AlertCircle, Plus, Trash2, Settings as SettingsIcon
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
// Contas e posts já não vivem no dispositivo — são guardados no servidor
// (Netlify Functions + Netlify Blobs), por isso toda a equipa partilha a
// mesma biblioteca, em qualquer telemóvel ou computador.
async function apiLogin(email, password) {
  const res = await fetch("/.netlify/functions/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password }),
  });
  return res.json();
}
async function apiSignup(name, email, password) {
  const res = await fetch("/.netlify/functions/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "signup", name, email, password }),
  });
  return res.json();
}
async function apiListPosts() {
  const res = await fetch("/.netlify/functions/posts");
  const data = await res.json();
  return data.ok ? data.posts : [];
}
async function apiSavePost(post) {
  const res = await fetch("/.netlify/functions/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post),
  });
  return res.json();
}
async function apiUpdatePostStatus(id, status) {
  const res = await fetch("/.netlify/functions/posts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });
  return res.json();
}
async function apiDeletePost(id) {
  const res = await fetch("/.netlify/functions/posts?id=" + encodeURIComponent(id), { method: "DELETE" });
  return res.json();
}
async function apiCreateVideo(topic) {
  const res = await fetch("/.netlify/functions/video-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  return res.json();
}
async function apiVideoStatus(sessionId) {
  const res = await fetch("/.netlify/functions/video-status?session_id=" + encodeURIComponent(sessionId));
  return res.json();
}
async function apiListImages() {
  const res = await fetch("/.netlify/functions/images");
  const data = await res.json();
  return data.ok ? data.images : [];
}
async function apiUploadImage(filename, tags, dataUrl) {
  const res = await fetch("/.netlify/functions/images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, tags, dataUrl }),
  });
  return res.json();
}
async function apiDeleteImage(id) {
  const res = await fetch("/.netlify/functions/images?id=" + encodeURIComponent(id), { method: "DELETE" });
  return res.json();
}
async function apiSearchStock(query) {
  const res = await fetch("/.netlify/functions/stock-images?q=" + encodeURIComponent(query));
  return res.json();
}
async function apiContentPlan() {
  const res = await fetch("/.netlify/functions/content-plan");
  return res.json();
}
function resizeImageFile(file, maxDim = 1024) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
        else { width = Math.round((width * maxDim) / height); height = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function useStorageStatus() {
  const [status, setStatus] = useState("idle");
  return status;
}

async function callClaude(prompt) {
  let response;
  try {
    response = await fetch("/.netlify/functions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  } catch (err) {
    throw new Error("Não consegui ligar ao servidor: " + (err?.message || String(err)));
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error("Resposta inválida do servidor: " + (err?.message || String(err)));
  }

  if (!data.ok) {
    throw new Error(data.error || "Erro desconhecido ao gerar conteúdo.");
  }
  return data.text;
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

    try {
      const result = mode === "entrar"
        ? await apiLogin(email, password)
        : await apiSignup(name, email, password);

      if (!result.ok) {
        setError(result.error || "Algo correu mal. Tenta novamente.");
        setLoading(false);
        return;
      }
      onLogin(result.user);
    } catch (err) {
      setError("Não foi possível ligar ao servidor. Tenta novamente.");
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
          Conta e biblioteca partilhadas por toda a equipa
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
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
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
    const post = {
      id: "post_" + Date.now(),
      category,
      status, // "rascunho" | "pronto"
      author: user.name,
      createdAt: new Date().toISOString(),
      platform,
      mediaNames: media.map((m) => m.name),
      ...result,
    };
    try {
      await apiSavePost(post);
    } catch (err) {
      setError("Não consegui guardar na biblioteca partilhada. Tenta novamente.");
      return;
    }
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
            <button
              onClick={() => setShowLibraryPicker((v) => !v)}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: "#8B3A4B" }}
            >
              <ImageIcon size={12} /> {showLibraryPicker ? "Fechar biblioteca" : "Escolher da biblioteca ou stock"}
            </button>
            {showLibraryPicker && (
              <div className="mt-3 p-3 rounded-lg" style={{ background: "#FBF4EC", border: "1px solid #E6D6C7" }}>
                <ImageLibrary
                  onSelect={(img) => {
                    setMedia((m) => [...m, img]);
                    setShowLibraryPicker(false);
                  }}
                />
              </div>
            )}
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
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    load();
  }, [refreshKey]);

  async function load() {
    setLoading(true);
    try {
      setPosts(await apiListPosts());
    } catch {
      setPosts([]);
    }
    setLoading(false);
  }

  async function markPublished(post) {
    await apiUpdatePostStatus(post.id, "publicado");
    load();
  }

  async function remove(post) {
    await apiDeletePost(post.id);
    load();
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

      {loading && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "#B0A196" }}>
          <Loader2 size={14} className="animate-spin" /> A carregar biblioteca partilhada...
        </div>
      )}

      {!loading && filtered.length === 0 && (
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
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    apiListPosts().then(setPosts).catch(() => setPosts([]));
  }, [refreshKey]);

  async function loadPlan() {
    setPlanLoading(true);
    setPlanError("");
    try {
      const result = await apiContentPlan();
      if (!result.ok) setPlanError(result.error || "Não consegui gerar sugestões.");
      else setPlan(result.suggestions);
    } catch (err) {
      setPlanError("Erro: " + (err?.message || String(err)));
    }
    setPlanLoading(false);
  }

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
        <div style={{ color: "#4A1E2A" }} className="text-sm font-medium">Plano de conteúdo (IA)</div>
        <button onClick={loadPlan} disabled={planLoading} className="text-xs" style={{ color: "#8B3A4B" }}>
          {planLoading ? "A analisar..." : plan ? "Atualizar" : "Gerar sugestões"}
        </button>
      </div>
      {planError && (
        <div className="flex items-start gap-2 text-sm mb-4" style={{ color: "#C24444" }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {planError}
        </div>
      )}
      {plan && (
        <div className="space-y-2 mb-6">
          {plan.map((s, i) => {
            const cat = CATEGORIES.find((c) => c.id === s.category);
            return (
              <button
                key={i}
                onClick={() => onOpenCategory(s.category)}
                className="w-full flex items-start gap-3 p-3.5 rounded-2xl text-left"
                style={{ background: "#FBF4EC", border: "1px solid #F3E3D3" }}
              >
                {cat && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#F3E3D3" }}>
                    <cat.icon size={14} color="#8B3A4B" strokeWidth={1.75} />
                  </div>
                )}
                <div className="min-w-0">
                  <div style={{ color: "#4A1E2A" }} className="text-sm font-medium">{s.label}</div>
                  <div style={{ color: "#8C7A6E" }} className="text-xs">{s.reason}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {!plan && !planLoading && !planError && (
        <p style={{ color: "#B0A196" }} className="text-xs mb-6">
          Toca em "Gerar sugestões" para a IA analisar o que já publicaste e recomendar os próximos 3 conteúdos.
        </p>
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
/* ---------------------------------------------------------
   GERADOR DE VÍDEO
--------------------------------------------------------- */
function VideoGenerator({ onSaved }) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(""); // "scripting" | "processing" | "completed" | "failed"
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setVideoUrl(null);
    setPhase("scripting");

    try {
      const result = await apiCreateVideo(topic);
      if (!result.ok) {
        setError(result.error || "Não consegui iniciar a geração do vídeo.");
        setLoading(false);
        setPhase("");
        return;
      }
      const sessionId = result.sessionId;

      pollRef.current = setInterval(async () => {
        try {
          const status = await apiVideoStatus(sessionId);
          if (!status.ok) {
            clearInterval(pollRef.current);
            setError(status.error || "Erro ao verificar o vídeo.");
            setLoading(false);
            setPhase("failed");
            return;
          }
          setPhase(status.status);
          if (status.status === "completed" && status.videoUrl) {
            clearInterval(pollRef.current);
            setVideoUrl(status.videoUrl);
            setLoading(false);
          } else if (status.status === "failed") {
            clearInterval(pollRef.current);
            setError("A geração do vídeo falhou do lado do HeyGen. Tenta outra vez.");
            setLoading(false);
          }
        } catch (err) {
          clearInterval(pollRef.current);
          setError("Erro ao verificar o vídeo: " + (err?.message || String(err)));
          setLoading(false);
        }
      }, 6000);
    } catch (err) {
      setError("Não foi possível ligar ao servidor: " + (err?.message || String(err)));
      setLoading(false);
      setPhase("");
    }
  }

  const phaseLabel = {
    scripting: "A escrever o guião...",
    processing: "A gerar o vídeo (pode demorar alguns minutos)...",
    completed: "Pronto!",
    failed: "Falhou.",
  };

  return (
    <div>
      <h2 style={{ fontFamily: "Fraunces, serif", color: "#4A1E2A" }} className="text-xl mb-1">
        Vídeo explicativo com IA
      </h2>
      <p style={{ color: "#8C7A6E" }} className="text-sm mb-6">
        Escreve o tema — a IA trata do guião, apresentador e montagem.
      </p>

      <div className="rounded-xl p-5 mb-4" style={{ background: "#fff", border: "1px solid #E6D6C7" }}>
        <label style={{ color: "#8C7A6E" }} className="text-xs block mb-2">
          Sobre o que deve ser o vídeo?
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={2}
          disabled={loading}
          className="w-full p-3 rounded-lg text-sm outline-none resize-none"
          style={{ background: "#FBF4EC", border: "1px solid #E6D6C7", color: "#4A1E2A" }}
          placeholder="Ex: diferença entre lentes progressivas e monofocais"
        />
        <button
          onClick={generate}
          disabled={loading || !topic.trim()}
          className="mt-3 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{ background: "#4A1E2A", color: "#FBF4EC", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
          {loading ? (phaseLabel[phase] || "A trabalhar...") : "Gerar vídeo"}
        </button>

        {error && (
          <div className="flex items-start gap-2 text-sm mt-3" style={{ color: "#C24444" }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {loading && (
          <p style={{ color: "#B0A196" }} className="text-xs mt-3">
            Isto pode demorar alguns minutos — não feches esta página.
          </p>
        )}
      </div>

      {videoUrl && (
        <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid #E6D6C7" }}>
          <video controls src={videoUrl} className="w-full rounded-lg mb-4" style={{ maxHeight: 420 }} />
          <div className="flex gap-2">
            <a
              href={videoUrl}
              download
              className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{ background: "#8B3A4B", color: "#FBF4EC" }}
            >
              Descarregar vídeo
            </a>
            <button
              onClick={() => { setVideoUrl(null); setTopic(""); setPhase(""); }}
              className="px-4 py-2.5 rounded-lg text-sm"
              style={{ background: "#FBF4EC", color: "#8C7A6E", border: "1px solid #E6D6C7" }}
            >
              Gerar outro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   DEFINIÇÕES (chaves de API guardadas na app, via Netlify Blobs)
--------------------------------------------------------- */
function SettingsPanel() {
  const [settings, setSettings] = useState([]);
  const [heygenKey, setHeygenKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/settings");
      const data = await res.json();
      setSettings(data.ok ? data.settings : []);
    } catch {
      setSettings([]);
    }
    setLoading(false);
  }

  const heygenEntry = settings.find((s) => s.key === "heygenApiKey");

  async function save() {
    if (!heygenKey.trim()) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/.netlify/functions/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "heygenApiKey", value: heygenKey.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Não consegui guardar a chave.");
        setSaving(false);
        return;
      }
      setHeygenKey("");
      setSuccess("Chave guardada com sucesso.");
      await load();
    } catch (err) {
      setError("Erro ao guardar: " + (err?.message || String(err)));
    }
    setSaving(false);
  }

  async function remove() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await fetch("/.netlify/functions/settings?key=heygenApiKey", { method: "DELETE" });
      setSuccess("Chave removida.");
      await load();
    } catch (err) {
      setError("Erro ao remover: " + (err?.message || String(err)));
    }
    setSaving(false);
  }

  return (
    <div>
      <h2 style={{ fontFamily: "Fraunces, serif", color: "#4A1E2A" }} className="text-xl mb-1">
        Definições
      </h2>
      <p style={{ color: "#8C7A6E" }} className="text-sm mb-6">
        Chaves de API usadas pela aplicação. Ficam guardadas em segurança no servidor.
      </p>

      <div className="rounded-xl p-5 mb-4" style={{ background: "#fff", border: "1px solid #E6D6C7" }}>
        <div className="flex items-center justify-between mb-2">
          <label style={{ color: "#4A1E2A" }} className="text-sm font-medium">Chave da API do HeyGen</label>
          {!loading && heygenEntry?.hasValue && (
            <span className="text-xs" style={{ color: "#5F7350" }}>
              Configurada ({heygenEntry.masked})
            </span>
          )}
        </div>
        <p style={{ color: "#8C7A6E" }} className="text-xs mb-3">
          Usada para gerar os vídeos com apresentador. Obtém a tua chave em heygen.com → Settings → API.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={heygenKey}
            onChange={(e) => setHeygenKey(e.target.value)}
            placeholder={heygenEntry?.hasValue ? "Nova chave (para substituir)" : "Cola aqui a tua chave"}
            className="flex-1 p-2.5 rounded-lg text-sm outline-none"
            style={{ background: "#FBF4EC", border: "1px solid #E6D6C7", color: "#4A1E2A" }}
          />
          <button
            onClick={save}
            disabled={saving || !heygenKey.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium shrink-0"
            style={{ background: "#8B3A4B", color: "#FBF4EC", opacity: saving ? 0.7 : 1 }}
          >
            Guardar
          </button>
        </div>
        {!loading && heygenEntry?.hasValue && (
          <button onClick={remove} disabled={saving} className="text-xs mt-3" style={{ color: "#C24444" }}>
            Remover chave
          </button>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm mt-3" style={{ color: "#C24444" }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm mt-3" style={{ color: "#5F7350" }}>
            <Check size={14} /> {success}
          </div>
        )}
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

        <nav className="flex gap-1 px-6 pt-4 max-w-3xl mx-auto overflow-x-auto">
          {[
            { id: "dashboard", label: "Início", icon: Eye },
            { id: "gerar", label: "Gerar conteúdo", icon: Sparkles },
            { id: "video", label: "Vídeo", icon: Video },
            { id: "imagens", label: "Imagens", icon: ImageIcon },
            { id: "biblioteca", label: "Biblioteca", icon: Layers },
            { id: "definicoes", label: "Definições", icon: SettingsIcon },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === "gerar") goToGenerator(null);
                else setTab(t.id);
                setRefreshKey((k) => k + 1);
              }}
              className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-t-lg shrink-0"
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
          {tab === "video" && <VideoGenerator />}
          {tab === "biblioteca" && <Library refreshKey={refreshKey} />}
          {tab === "imagens" && <ImageLibrary />}
          {tab === "definicoes" && <SettingsPanel />}
        </main>
      </div>
    </>
  );
}

/* ---------------------------------------------------------
   BIBLIOTECA DE IMAGENS (própria + stock)
   Pode ser usada em modo "gestão" (separador Imagens) ou
   modo "escolher" (dentro do Gerador, passando onSelect).
--------------------------------------------------------- */
function ImageLibrary({ onSelect }) {
  const [subTab, setSubTab] = useState("minha");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tagsInput, setTagsInput] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [stockResults, setStockResults] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => { loadImages(); }, []);

  async function loadImages() {
    setLoading(true);
    try { setImages(await apiListImages()); } catch { setImages([]); }
    setLoading(false);
  }

  async function handleFilePicked(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setUploading(true);
    setError("");
    try {
      const dataUrl = await resizeImageFile(pendingFile);
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      await apiUploadImage(pendingFile.name, tags, dataUrl);
      setPendingFile(null);
      setPendingPreview(null);
      setTagsInput("");
      loadImages();
    } catch (err) {
      setError("Não consegui enviar a imagem: " + (err?.message || String(err)));
    }
    setUploading(false);
  }

  async function removeImage(id) {
    await apiDeleteImage(id);
    loadImages();
  }

  async function searchStock() {
    if (!query.trim()) return;
    setStockLoading(true);
    setError("");
    try {
      const result = await apiSearchStock(query);
      if (!result.ok) { setError(result.error || "Erro na pesquisa."); setStockResults([]); }
      else setStockResults(result.results || []);
    } catch (err) {
      setError("Erro na pesquisa: " + (err?.message || String(err)));
    }
    setStockLoading(false);
  }

  async function saveStockToLibrary(item) {
    try {
      const res = await fetch(item.full);
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await apiUploadImage("stock-" + item.id, ["stock", item.credit], dataUrl);
      loadImages();
    } catch (err) {
      setError("Não consegui guardar essa imagem: " + (err?.message || String(err)));
    }
  }

  const filteredOwn = images;

  return (
    <div>
      {!onSelect && (
        <>
          <h2 style={{ fontFamily: "Fraunces, serif", color: "#4A1E2A" }} className="text-xl mb-1">
            Imagens
          </h2>
          <p style={{ color: "#8C7A6E" }} className="text-sm mb-5">
            A tua biblioteca de fotos, ou pesquisa fotos de stock para inspiração.
          </p>
        </>
      )}

      <div className="flex gap-1.5 mb-4">
        {["minha", "stock"].map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className="text-xs px-3 py-1.5 rounded-full"
            style={{
              background: subTab === t ? "#4A1E2A" : "#fff",
              color: subTab === t ? "#FBF4EC" : "#8C7A6E",
              border: "1px solid #E6D6C7",
            }}
          >
            {t === "minha" ? "A minha biblioteca" : "Pesquisar stock"}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm mb-3" style={{ color: "#C24444" }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {subTab === "minha" && (
        <div>
          <div className="rounded-xl p-4 mb-4" style={{ background: "#fff", border: "1px solid #E6D6C7" }}>
            {!pendingPreview ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-6 rounded-lg flex flex-col items-center gap-2 text-sm"
                style={{ border: "1.5px dashed #E6D6C7", color: "#8C7A6E" }}
              >
                <Plus size={18} />
                Adicionar foto da loja
              </button>
            ) : (
              <div>
                <img src={pendingPreview} alt="" className="w-full rounded-lg mb-3" style={{ maxHeight: 220, objectFit: "cover" }} />
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Etiquetas separadas por vírgula (ex: óculos de sol, Ray-Ban)"
                  className="w-full p-2.5 rounded-lg text-sm outline-none mb-2"
                  style={{ background: "#FBF4EC", border: "1px solid #E6D6C7", color: "#4A1E2A" }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={confirmUpload}
                    disabled={uploading}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: "#8B3A4B", color: "#FBF4EC", opacity: uploading ? 0.7 : 1 }}
                  >
                    {uploading ? "A enviar..." : "Guardar na biblioteca"}
                  </button>
                  <button
                    onClick={() => { setPendingFile(null); setPendingPreview(null); }}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ background: "#FBF4EC", color: "#8C7A6E", border: "1px solid #E6D6C7" }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFilePicked} />
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "#B0A196" }}>
              <Loader2 size={14} className="animate-spin" /> A carregar...
            </div>
          )}

          {!loading && filteredOwn.length === 0 && (
            <p style={{ color: "#B0A196" }} className="text-sm text-center py-8">Ainda não tens fotos guardadas.</p>
          )}

          <div className="grid grid-cols-3 gap-2">
            {filteredOwn.map((img) => (
              <div key={img.id} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: "1", border: "1px solid #E6D6C7" }}>
                <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                {onSelect ? (
                  <button
                    onClick={() => onSelect({ name: img.filename, url: img.dataUrl, type: "image" })}
                    className="absolute inset-0 flex items-center justify-center text-xs font-medium opacity-0 hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(74,30,42,0.75)", color: "#FBF4EC" }}
                  >
                    Usar
                  </button>
                ) : (
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(74,30,42,0.7)" }}
                  >
                    <X size={11} color="#fff" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === "stock" && (
        <div>
          <div className="flex gap-2 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchStock()}
              placeholder="Ex: óculos de sol, ótica, moda"
              className="flex-1 p-2.5 rounded-lg text-sm outline-none"
              style={{ background: "#fff", border: "1px solid #E6D6C7", color: "#4A1E2A" }}
            />
            <button
              onClick={searchStock}
              disabled={stockLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "#4A1E2A", color: "#FBF4EC" }}
            >
              {stockLoading ? <Loader2 size={14} className="animate-spin" /> : "Pesquisar"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {stockResults.map((item) => (
              <div key={item.id} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: "1", border: "1px solid #E6D6C7" }}>
                <img src={item.thumb} alt="" className="w-full h-full object-cover" />
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity text-center p-1"
                  style={{ background: "rgba(74,30,42,0.85)" }}
                >
                  {onSelect && (
                    <button
                      onClick={() => onSelect({ name: item.credit, url: item.full, type: "image" })}
                      className="text-xs font-medium px-2 py-1 rounded"
                      style={{ background: "#8B3A4B", color: "#FBF4EC" }}
                    >
                      Usar
                    </button>
                  )}
                  <button
                    onClick={() => saveStockToLibrary(item)}
                    className="text-[10px] px-2 py-1 rounded"
                    style={{ background: "#FBF4EC", color: "#4A1E2A" }}
                  >
                    Guardar
                  </button>
                  <span style={{ color: "#E6D6C7" }} className="text-[9px]">© {item.credit}</span>
                </div>
              </div>
            ))}
          </div>
          {stockResults.length === 0 && !stockLoading && (
            <p style={{ color: "#B0A196" }} className="text-sm text-center py-8">Pesquisa por um termo para veres resultados.</p>
          )}
        </div>
      )}
    </div>
  );
}
