import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════ */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
  :root {
    --bg:#070e1a; --bg2:#0b1525; --bg3:#0f1d2e; --border:#1a2d44;
    --accent:#00d4ff; --accent2:#7c3aed; --accent3:#10b981;
    --warn:#f59e0b; --danger:#f43f5e;
    --text:#ddeeff; --text2:#7a9bb5; --text3:#3d5a70;
    --card:#0c1929; --card2:#101e30;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--text); font-family:'Syne',sans-serif; }
  body::before {
    content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
    background:
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,212,255,0.05) 0%, transparent 60%),
      linear-gradient(rgba(0,212,255,0.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,255,0.022) 1px, transparent 1px);
    background-size: auto, 48px 48px, 48px 48px;
  }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-track { background:var(--bg2); }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes slideR  { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
`;

/* ═══════════════════════════════════════════════
   ANTHROPIC API HELPER
═══════════════════════════════════════════════ */
const MODEL = "claude-haiku-4-5-20251001";

async function callClaude(apiKey, systemPrompt, userPrompt, useSearch = false) {
  const body = {
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const e = await resp.json();
    throw new Error(e.error?.message || `HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  return parseJSON(text);
}

function parseJSON(text) {
  // Extract between first { and last }
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Nenhum JSON na resposta");
  let raw = text.slice(start, end + 1);

  // Basic cleanup
  raw = raw
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,(\s*[}\]])/g, "$1")
    .replace(/[\t\r]/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ");

  // Try as-is first
  try { return JSON.parse(raw); } catch {}

  // Walk the string tracking depth; cut at the point where
  // depth returns to 0 — handles truncated responses
  let depth = 0, cutAt = raw.length;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") { depth--; if (depth === 0) { cutAt = i + 1; break; } }
  }
  raw = raw.slice(0, cutAt);
  try { return JSON.parse(raw); } catch {}

  // If still truncated, close all open brackets
  depth = 0;
  const stack = [];
  let inStr = false, esc = false;
  for (const c of raw) {
    if (esc) { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
  }
  // Remove trailing incomplete property (e.g. "key": or "key": val without closing)
  raw = raw.replace(/,?\s*"[^"]*"\s*:\s*[^,}\]]*$/, "");
  raw = raw.replace(/,?\s*"[^"]*"\s*$/, "");
  raw += stack.reverse().join("");
  try { return JSON.parse(raw); } catch(e) {
    throw new Error(`JSON inválido: ${e.message}`);
  }
}

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function fmt(price, currency = "BRL") {
  if (!price && price !== 0) return "—";
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(price);
}

function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  const set = (v) => {
    const next = typeof v === "function" ? v(val) : v;
    setVal(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };
  return [val, set];
}

/* ═══════════════════════════════════════════════
   SHARED STYLE ATOMS
═══════════════════════════════════════════════ */
const A = {
  label:     { fontSize: 11, color: "var(--text2)", letterSpacing: .5, marginBottom: 4, display: "block" },
  input:     { width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 14px", borderRadius: 8, fontFamily: "'Syne',sans-serif", fontSize: 13, outline: "none", transition: "border-color .2s" },
  btnPrimary:{ background: "linear-gradient(135deg,var(--accent),var(--accent2))", color: "#000", border: "none", padding: "12px 22px", borderRadius: 10, fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 },
  btnGhost:  { background: "none", border: "1px solid var(--border)", color: "var(--text2)", padding: "10px 18px", borderRadius: 8, fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  card:      { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14 },
};

const TH = { padding: "10px 14px", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--text2)", fontFamily: "'Space Mono',monospace", borderBottom: "1px solid var(--border)", textAlign: "center", whiteSpace: "nowrap", fontWeight: 700 };
const TD = { padding: "12px 14px", verticalAlign: "middle" };

function SLabel({ children, color }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: color || "var(--text3)", fontFamily: "'Space Mono',monospace", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
      {children}<div style={{ flex: 1, height: 1, background: color ? `${color}30` : "var(--border)" }} />
    </div>
  );
}

const CAT_COLORS = { "Smartphones":"#00d4ff","Notebooks":"#a78bfa","TVs":"#f59e0b","Tablets":"#10b981","Fones":"#f43f5e","Câmeras":"#fb923c","Áudio":"#38bdf8","Geral":"#7a9bb5" };
const catColor = cat => CAT_COLORS[cat] || "#7a9bb5";

/* ═══════════════════════════════════════════════
   SCREEN — API KEY GATE
═══════════════════════════════════════════════ */
function ApiKeyScreen({ onSave }) {
  const [key, setKey]   = useState("");
  const [show, setShow] = useState(false);

  const isValid = key.startsWith("sk-");

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ ...A.card, padding: "44px 48px", maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Price<span style={{ color: "var(--accent)" }}>Radar</span></div>
        <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "'Space Mono',monospace", letterSpacing: 1.5, marginBottom: 28 }}>POSICIONAMENTO COMPETITIVO</div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 6, padding: "6px 12px", marginBottom: 22, fontSize: 11, color: "var(--accent3)", fontFamily: "'Space Mono',monospace" }}>
          ⚡ {MODEL}
        </div>

        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, marginBottom: 26 }}>
          Informe sua <strong style={{ color: "var(--text)" }}>Anthropic API Key</strong> para ativar as buscas em tempo real.
          <br />
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: 12 }}>↗ Obter em console.anthropic.com</a>
        </div>

        <div style={{ position: "relative", marginBottom: 14 }}>
          <input type={show ? "text" : "password"} value={key} onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && isValid && onSave(key)}
            placeholder="sk-ant-api03-..."
            style={{ ...A.input, paddingRight: 44, fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: 1 }} />
          <button onClick={() => setShow(s => !s)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16 }}>
            {show ? "🙈" : "👁"}
          </button>
        </div>

        <button onClick={() => isValid && onSave(key)} disabled={!isValid}
          style={{ ...A.btnPrimary, width: "100%", justifyContent: "center", opacity: isValid ? 1 : 0.4 }}>
          Entrar →
        </button>

        <div style={{ marginTop: 18, fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
          🔒 A chave fica apenas no sessionStorage do seu navegador.
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN — PRODUCT FORM
═══════════════════════════════════════════════ */
const CATEGORIES = ["Smartphones","Notebooks","TVs","Tablets","Fones","Câmeras","Áudio","Geral"];
const EMPTY_FORM = { name:"", brand:"", model:"", category:"Geral", myPrice:"", currency:"BRL", ean:"", description:"", specs:"", competitorBrands:"" };

function ProductFormScreen({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const isEdit = !!initial?.id;

  const save = () => {
    if (!form.name.trim()) return alert("Informe o nome do produto.");
    onSave({ ...form, id: initial?.id || Date.now(), myPrice: parseFloat(form.myPrice) || null });
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px", animation: "slideR .3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, fontSize: 13, color: "var(--text2)" }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, fontFamily: "'Syne',sans-serif", padding: 0 }}>← Catálogo</button>
        <span style={{ color: "var(--text3)" }}>/</span>
        <span>{isEdit ? "Editar Produto" : "Novo Produto"}</span>
      </div>

      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 28 }}>{isEdit ? "✏️ Editar Produto" : "📦 Cadastrar Produto"}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ ...A.card, padding: "24px 28px" }}>
          <SLabel>Identificação</SLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={A.label}>Nome do Produto *</label>
              <input style={A.input} value={form.name} onChange={set("name")} placeholder="Ex: Infinix Note 50x 128GB Preto" />
            </div>
            <div>
              <label style={A.label}>Marca</label>
              <input style={A.input} value={form.brand} onChange={set("brand")} placeholder="Ex: Infinix" />
            </div>
            <div>
              <label style={A.label}>Modelo / SKU</label>
              <input style={A.input} value={form.model} onChange={set("model")} placeholder="Ex: Note 50x" />
            </div>
            <div>
              <label style={A.label}>Categoria</label>
              <select style={A.input} value={form.category} onChange={set("category")}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={A.label}>EAN / Código de barras</label>
              <input style={A.input} value={form.ean} onChange={set("ean")} placeholder="7891234567890" />
            </div>
          </div>
        </div>

        <div style={{ ...A.card, padding: "24px 28px" }}>
          <SLabel>Precificação</SLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={A.label}>Meu Preço de Venda</label>
              <input style={A.input} type="number" value={form.myPrice} onChange={set("myPrice")} placeholder="0,00" min="0" step="0.01" />
            </div>
            <div>
              <label style={A.label}>Moeda</label>
              <select style={A.input} value={form.currency} onChange={set("currency")}>
                <option value="BRL">R$ BRL</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ ...A.card, padding: "24px 28px" }}>
          <SLabel>Descrição & Specs</SLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={A.label}>Descrição resumida</label>
              <textarea style={{ ...A.input, resize: "vertical", minHeight: 72 }} value={form.description} onChange={set("description")} placeholder="Descreva brevemente o produto, diferenciais, público-alvo..." />
            </div>
            <div>
              <label style={A.label}>Especificações técnicas conhecidas <span style={{ color: "var(--text3)" }}>(opcional — o modelo busca online)</span></label>
              <textarea style={{ ...A.input, resize: "vertical", minHeight: 90 }} value={form.specs} onChange={set("specs")} placeholder={'Ex: Tela 6.78" AMOLED 120Hz, Câmera 108MP, Bateria 5000mAh, RAM 8GB, 128GB, Android 14...'} />
            </div>
          </div>
        </div>

        <div style={{ ...A.card, padding: "24px 28px" }}>
          <SLabel color="var(--accent2)">Inteligência Competitiva</SLabel>
          <div>
            <label style={A.label}>
              Marcas concorrentes sugeridas
              <span style={{ color: "var(--text3)", fontWeight: 400 }}> — a IA prioriza estas na busca por concorrentes</span>
            </label>
            <input
              style={A.input}
              value={form.competitorBrands}
              onChange={set("competitorBrands")}
              placeholder="Ex: Samsung, Motorola, Xiaomi, Realme, POCO"
            />
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
              Separe por vírgula. Deixe em branco para a IA decidir livremente.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={A.btnGhost}>Cancelar</button>
          <button onClick={save} style={A.btnPrimary}>{isEdit ? "💾 Salvar" : "✅ Cadastrar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN — CATALOG
═══════════════════════════════════════════════ */
function CatalogScreen({ products, onNew, onEdit, onDelete, onAnalyze }) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand||"").toLowerCase().includes(search.toLowerCase()) ||
    (p.category||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px", animation: "fadeIn .3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>📦 Catálogo de Produtos</div>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>{products.length} produto{products.length !== 1 ? "s" : ""} cadastrado{products.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={onNew} style={A.btnPrimary}>＋ Novo Produto</button>
      </div>

      {products.length > 0 && (
        <input style={{ ...A.input, marginBottom: 20 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Buscar por nome, marca ou categoria..." />
      )}

      {products.length === 0 && (
        <div style={{ ...A.card, padding: "64px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 52, opacity: .15, marginBottom: 16 }}>📦</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text2)", marginBottom: 8 }}>Nenhum produto cadastrado</div>
          <div style={{ fontSize: 13, color: "var(--text3)", maxWidth: 340, margin: "0 auto 24px", lineHeight: 1.8 }}>
            Cadastre seus produtos para depois escolher qual analisar no mercado.
          </div>
          <button onClick={onNew} style={A.btnPrimary}>＋ Cadastrar primeiro produto</button>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px,1fr))", gap: 14 }}>
          {filtered.map(p => <ProductCard key={p.id} product={p} onEdit={onEdit} onDelete={onDelete} onAnalyze={onAnalyze} />)}
        </div>
      )}

      {filtered.length === 0 && products.length > 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text3)" }}>Nenhum resultado para "{search}"</div>
      )}
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete, onAnalyze }) {
  const color = catColor(product.category);
  const [hov, setHov] = useState(false);
  return (
    <div style={{ ...A.card, overflow: "hidden", display: "flex", flexDirection: "column", borderColor: hov ? `${color}60` : "var(--border)", transition: "border-color .2s" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${color},${color}44)` }} />
      <div style={{ padding: "18px 20px", flex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", marginBottom: 10, fontSize: 10, letterSpacing: .8, textTransform: "uppercase", fontFamily: "'Space Mono',monospace", color, background: `${color}15`, border: `1px solid ${color}30`, padding: "3px 8px", borderRadius: 4 }}>
          {product.category}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2, lineHeight: 1.3 }}>{product.name}</div>
        {product.brand && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>{product.brand}{product.model ? ` · ${product.model}` : ""}</div>}
        {product.myPrice && (
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color, marginBottom: 8 }}>
            {fmt(product.myPrice, product.currency)}
          </div>
        )}
        {product.description && (
          <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {product.description}
          </div>
        )}
      </div>
      <div style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
        {[
          { label: "✏️ Editar",  onClick: () => onEdit(product),   hoverBg: "rgba(255,255,255,0.04)", hoverClr: null },
          { label: "🗑 Remover", onClick: () => { if (confirm(`Remover "${product.name}"?`)) onDelete(product.id); }, hoverBg: "rgba(244,63,94,0.08)", hoverClr: "var(--danger)" },
          { label: "📊 Analisar",onClick: () => onAnalyze(product), hoverBg: `${color}12`, hoverClr: color, bold: true },
        ].map((btn, i, arr) => (
          <BtnCell key={i} {...btn} last={i === arr.length - 1} />
        ))}
      </div>
    </div>
  );
}

function BtnCell({ label, onClick, hoverBg, hoverClr, bold, last }) {
  const [h, setH] = useState(false);
  return (
    <>
      <button onClick={onClick}
        onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ flex: 1, background: h ? hoverBg : "none", border: "none", color: h && hoverClr ? hoverClr : "var(--text2)", cursor: "pointer", padding: "11px 0", fontSize: 12, fontFamily: "'Syne',sans-serif", fontWeight: bold ? 700 : 500, transition: "all .15s" }}>
        {label}
      </button>
      {!last && <div style={{ width: 1, background: "var(--border)" }} />}
    </>
  );
}

/* ═══════════════════════════════════════════════
   AI STEPS
═══════════════════════════════════════════════ */
async function runAnalysis(apiKey, product, onLog) {
  onLog("🔍 Buscando specs, concorrentes e preços...", "search");

  const brandHint = product.competitorBrands?.trim() ? `Priorize concorrentes das marcas: ${product.competitorBrands}.` : "";
  const storeList = "Mercado Livre, Americanas, Amazon BR, Magazine Luiza, Casas Bahia, KaBuM";

  const sys = `Analista de mercado BR especialista em produtos. Use busca web para dados reais e atuais. Responda APENAS JSON válido, sem markdown, sem comentários, sem vírgulas finais.`;

  const usr = `Produto: ${product.name}${product.brand ? ` | Marca: ${product.brand}` : ""}${product.model ? ` ${product.model}` : ""}
Categoria: ${product.category} | Meu preço: ${product.myPrice ? fmt(product.myPrice, product.currency) : "não definido"}
${product.specs ? `Specs conhecidas: ${product.specs}` : ""}
${brandHint}

Busque na web:
1. Ficha técnica completa do produto
2. Preço atual do produto nas lojas: ${storeList}
3. 3 concorrentes diretos com preços atuais nas mesmas lojas

JSON (sem comentários, sem vírgulas finais):
{"product_name":"","brand":"","model":"","official_description":"","specs":{"campo":"valor"},"category_label":"","market_min_price":0,"market_max_price":0,"market_avg_price":0,"my_product_stores":[{"store":"","price":0,"url":"","installments":""}],"price_position_label":"","competitors":[{"name":"","brand":"","min_price":0,"max_price":0,"avg_price":0,"prices_by_store":[{"store":"","price":0,"url":"","installments":""}],"specs":{"campo":"valor"},"vs_my_product":""}],"insights":[{"icon":"","title":"","description":""}],"spec_gaps":"","recommendation":""}`;

  const result = await callClaude(apiKey, sys, usr, true);
  onLog(`✓ ${Object.keys(result.specs || {}).length} specs | ${result.competitors?.length || 0} concorrentes`, "ok");
  return result;
}

/* ═══════════════════════════════════════════════
   VISUALIZATIONS
═══════════════════════════════════════════════ */
const COMP_COLORS = ["#f43f5e","#f59e0b","#10b981","#a78bfa","#fb923c","#38bdf8"];

function Spectrum({ myPrice, myStorePrices, competitors, currency }) {
  const all = [
    myPrice,
    ...(myStorePrices||[]).map(p=>p.price),
    ...(competitors||[]).flatMap(c=>[c.min_price,c.max_price]),
  ].filter(p => p > 0);
  if (!all.length) return null;

  const gMin = Math.min(...all)*0.96;
  const gMax = Math.max(...all)*1.04;
  const pct  = v => Math.max(0, Math.min(100, ((v-gMin)/(gMax-gMin))*100));

  return (
    <div style={{ padding: "8px 0 4px" }}>
      <div style={{ position: "relative", marginBottom: 54 }}>
        {/* Track */}
        <div style={{ height: 8, borderRadius: 4, background: "linear-gradient(90deg,rgba(16,185,129,.35),rgba(245,158,11,.35),rgba(244,63,94,.35))" }}>
          <div style={{ position: "absolute", top: 16, left: 0,    fontSize: 10, color: "var(--accent3)", fontFamily: "'Space Mono',monospace" }}>MAIS BARATO</div>
          <div style={{ position: "absolute", top: 16, left: "50%",transform: "translateX(-50%)", fontSize: 10, color: "var(--text3)", fontFamily: "'Space Mono',monospace" }}>MÉDIO</div>
          <div style={{ position: "absolute", top: 16, right: 0,   fontSize: 10, color: "var(--danger)", fontFamily: "'Space Mono',monospace" }}>MAIS CARO</div>
        </div>

        {/* Competitor range bars */}
        {(competitors||[]).map((c,i) => {
          if (!c.min_price||!c.max_price) return null;
          const color = COMP_COLORS[i%COMP_COLORS.length];
          const l = pct(c.min_price), r = pct(c.max_price);
          return <div key={i} style={{ position:"absolute",top:0,left:`${l}%`,width:`${r-l}%`,height:8,background:`${color}28`,border:`1px solid ${color}50`,borderRadius:4 }} />;
        })}

        {/* Competitor avg dots */}
        {(competitors||[]).map((c,i) => {
          if (!c.avg_price) return null;
          const color = COMP_COLORS[i%COMP_COLORS.length];
          return (
            <div key={i} style={{ position:"absolute",top:-3,left:`calc(${pct(c.avg_price)}% - 7px)` }} title={`${c.name}: ${fmt(c.avg_price,currency)}`}>
              <div style={{ width:14,height:14,borderRadius:"50%",background:color,border:"2px solid var(--bg3)",boxShadow:`0 0 8px ${color}80` }} />
            </div>
          );
        })}

        {/* My product dot */}
        {myPrice > 0 && (
          <div style={{ position:"absolute",top:-8,left:`calc(${pct(myPrice)}% - 12px)`,zIndex:2 }}>
            <div style={{ width:24,height:24,borderRadius:"50%",background:"var(--accent)",border:"3px solid #fff",boxShadow:"0 0 20px rgba(0,212,255,.7)" }} title={`Meu produto: ${fmt(myPrice,currency)}`} />
            <div style={{ position:"absolute",bottom:30,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:"var(--accent)",background:"var(--bg)",padding:"3px 8px",borderRadius:4,border:"1px solid rgba(0,212,255,.3)" }}>
              ⭐ {fmt(myPrice,currency)}
            </div>
          </div>
        )}
      </div>

      {/* Scale */}
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,fontFamily:"'Space Mono',monospace",color:"var(--text3)",marginBottom:18 }}>
        <span>{fmt(gMin,currency)}</span><span>{fmt(gMax,currency)}</span>
      </div>

      {/* Legend */}
      <div style={{ display:"flex",flexWrap:"wrap",gap:12 }}>
        {myPrice > 0 && (
          <div style={{ display:"flex",alignItems:"center",gap:7,fontSize:12 }}>
            <div style={{ width:12,height:12,borderRadius:"50%",background:"var(--accent)",boxShadow:"0 0 8px rgba(0,212,255,.7)" }} />
            <span style={{ color:"var(--accent)",fontWeight:700 }}>⭐ Meu produto</span>
          </div>
        )}
        {(competitors||[]).map((c,i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:7,fontSize:12 }}>
            <div style={{ width:12,height:12,borderRadius:"50%",background:COMP_COLORS[i%COMP_COLORS.length] }} />
            <span style={{ color:"var(--text2)" }}>{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoreTable({ myProduct, myStorePrices, competitors, currency }) {
  const storeSet = new Set();
  (myStorePrices||[]).forEach(p => storeSet.add(p.store));
  (competitors||[]).forEach(c => (c.prices_by_store||[]).forEach(p => storeSet.add(p.store)));
  const stores = Array.from(storeSet);

  const allPrices = [...(myStorePrices||[]).map(p=>p.price), ...(competitors||[]).flatMap(c=>(c.prices_by_store||[]).map(p=>p.price))].filter(Boolean);
  const pMin = Math.min(...allPrices), pMax = Math.max(...allPrices);
  const cellClr = p => !p||pMax===pMin ? "var(--text)" : (p-pMin)/(pMax-pMin) < 0.25 ? "var(--accent3)" : (p-pMin)/(pMax-pMin) > 0.75 ? "var(--danger)" : "var(--warn)";

  const rows = [
    { label: "⭐ "+myProduct.name, pricesByStore: myStorePrices, isMine: true },
    ...(competitors||[]).map(c => ({ label: c.name, pricesByStore: c.prices_by_store, isMine: false })),
  ];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
        <thead>
          <tr>
            <th style={{ ...TH,textAlign:"left",minWidth:180,background:"rgba(0,0,0,0.25)" }}>Produto</th>
            <th style={{ ...TH,color:"var(--accent3)",background:"rgba(0,0,0,0.25)" }}>Mín</th>
            <th style={{ ...TH,background:"rgba(0,0,0,0.25)" }}>Média</th>
            <th style={{ ...TH,color:"var(--danger)",background:"rgba(0,0,0,0.25)" }}>Máx</th>
            {stores.map(s => <th key={s} style={{ ...TH,background:"rgba(0,0,0,0.15)" }}>{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,ri) => {
            const prices = (row.pricesByStore||[]).map(p=>p.price).filter(Boolean);
            const rMin = prices.length ? Math.min(...prices) : null;
            const rMax = prices.length ? Math.max(...prices) : null;
            const rAvg = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0)/prices.length) : null;
            return (
              <tr key={ri} style={{ background:row.isMine?"rgba(0,212,255,0.05)":ri%2===0?"rgba(255,255,255,.01)":"transparent",borderBottom:"1px solid rgba(26,45,68,0.5)" }}>
                <td style={{ ...TD,fontWeight:row.isMine?700:500,color:row.isMine?"var(--accent)":"var(--text)" }}>{row.label}</td>
                <td style={{ ...TD,fontFamily:"'Space Mono',monospace",color:"var(--accent3)",textAlign:"center",fontWeight:700 }}>{fmt(rMin,currency)}</td>
                <td style={{ ...TD,fontFamily:"'Space Mono',monospace",color:"var(--text2)",textAlign:"center" }}>{fmt(rAvg,currency)}</td>
                <td style={{ ...TD,fontFamily:"'Space Mono',monospace",color:"var(--danger)",textAlign:"center",fontWeight:700 }}>{fmt(rMax,currency)}</td>
                {stores.map(store => {
                  const entry = (row.pricesByStore||[]).find(p=>p.store===store);
                  return (
                    <td key={store} style={{ ...TD,textAlign:"center" }}>
                      {entry ? (
                        <div>
                          <div style={{ fontFamily:"'Space Mono',monospace",fontWeight:700,color:cellClr(entry.price) }}>{fmt(entry.price,currency)}</div>
                          {entry.installments&&<div style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>{entry.installments}</div>}
                          {entry.url&&<a href={entry.url} target="_blank" rel="noreferrer" style={{ fontSize:11,color:"var(--accent)",textDecoration:"none",opacity:.7 }}>↗</a>}
                        </div>
                      ) : <span style={{ color:"var(--text3)",fontSize:12 }}>—</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop:10,fontSize:11,color:"var(--text3)",fontFamily:"'Space Mono',monospace" }}>
        Cores: <span style={{ color:"var(--accent3)" }}>■ mais barato</span> &nbsp;
        <span style={{ color:"var(--warn)" }}>■ intermediário</span> &nbsp;
        <span style={{ color:"var(--danger)" }}>■ mais caro</span>
      </div>
    </div>
  );
}

function SpecTable({ myName, mySpecs, competitors }) {
  if (!mySpecs||!Object.keys(mySpecs).length) return <div style={{ color:"var(--text3)",fontSize:13 }}>Specs não disponíveis.</div>;
  const allKeys = new Set(Object.keys(mySpecs));
  competitors.forEach(c => { if (c.specs) Object.keys(c.specs).forEach(k => allKeys.add(k)); });
  const keys  = Array.from(allKeys);
  const cols  = competitors.filter(c => c.specs && Object.keys(c.specs).length > 0);
  if (!cols.length) return <div style={{ color:"var(--text3)",fontSize:13 }}>Specs dos concorrentes não disponíveis.</div>;

  const sc = (a,b) => {
    if (!a||!b) return "n";
    const n = v => parseFloat(String(v).replace(/[^\d.]/g,""));
    const x=n(a),y=n(b);
    if (isNaN(x)||isNaN(y)) return a.toLowerCase()===b.toLowerCase()?"eq":"n";
    return x>y?"win":x<y?"lose":"eq";
  };
  const bg  = {win:"rgba(16,185,129,.09)",lose:"rgba(244,63,94,.08)",eq:"rgba(0,212,255,.05)",n:"transparent"};
  const clr = {win:"var(--accent3)",lose:"var(--danger)",eq:"var(--accent)",n:"var(--text2)"};
  const ico = {win:"↑ ",lose:"↓ ",eq:"≈ ",n:""};

  return (
    <div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
          <thead>
            <tr>
              <th style={{ ...TH,textAlign:"left",minWidth:150,background:"rgba(0,0,0,0.25)" }}>Especificação</th>
              <th style={{ ...TH,background:"rgba(0,212,255,0.07)",color:"var(--accent)",borderBottom:"2px solid var(--accent)" }}>⭐ {myName}</th>
              {cols.map((c,i) => <th key={i} style={{ ...TH,background:"rgba(0,0,0,0.12)" }}>{c.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {keys.map(key => (
              <tr key={key} style={{ borderBottom:"1px solid rgba(26,45,68,0.5)" }}>
                <td style={{ ...TD,fontFamily:"'Space Mono',monospace",fontSize:11,color:"var(--text3)",background:"rgba(0,0,0,0.15)",whiteSpace:"nowrap" }}>{key}</td>
                <td style={{ ...TD,fontWeight:600,background:"rgba(0,212,255,0.04)" }}>{mySpecs[key]||<span style={{ color:"var(--text3)" }}>—</span>}</td>
                {cols.map((c,i) => {
                  const cv=c.specs?.[key];
                  const s=mySpecs[key]&&cv?sc(mySpecs[key],cv):"n";
                  return <td key={i} style={{ ...TD,background:bg[s] }}>{cv?<span style={{ color:clr[s] }}>{ico[s]}{cv}</span>:<span style={{ color:"var(--text3)" }}>—</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop:10,fontSize:11,color:"var(--text3)",fontFamily:"'Space Mono',monospace" }}>
        <span style={{ color:"var(--accent3)" }}>↑ meu produto é melhor</span> &nbsp;
        <span style={{ color:"var(--danger)" }}>↓ concorrente é melhor</span> &nbsp;
        <span style={{ color:"var(--accent)" }}>≈ equivalente</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN — ANALYSIS
═══════════════════════════════════════════════ */
function AnalysisScreen({ product, apiKey, onBack }) {
  const [phase, setPhase]       = useState("idle");
  const [logs, setLogs]         = useState([]);
  const [mySpecs, setMySpecs]   = useState(null);
  const [market, setMarket]     = useState(null);
  const [tab, setTab]           = useState("spectrum");
  const [error, setError]       = useState("");
  const logRef = useRef(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  const addLog = (msg, type="") => {
    const ts = new Date().toLocaleTimeString("pt-BR");
    setLogs(prev => [...prev, { ts, msg, type }]);
  };

  const run = async () => {
    setPhase("loading"); setLogs([]); setError("");
    try {
      const result = await runAnalysis(apiKey, product, addLog);
      setMySpecs(result);
      setMarket(result);
      addLog("✅ Análise concluída!", "ok");
      setPhase("done");
    } catch(e) {
      setError(e.message);
      addLog(`✗ ${e.message}`);
      setPhase("error");
    }
  };

  const color = catColor(product.category);
  const comps = market?.competitors || [];

  const downloadPDF = () => {
    const date = new Date().toLocaleDateString("pt-BR");
    const storeSet = new Set();
    (market?.my_product_stores||[]).forEach(p => storeSet.add(p.store));
    comps.forEach(c => (c.prices_by_store||[]).forEach(p => storeSet.add(p.store)));
    const stores = Array.from(storeSet);

    const allSpecKeys = new Set(Object.keys(mySpecs?.specs||{}));
    comps.forEach(c => { if (c.specs) Object.keys(c.specs).forEach(k => allSpecKeys.add(k)); });

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>PriceRadar — ${product.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',sans-serif;color:#1a2332;background:#fff;padding:32px 40px;font-size:13px}
  h1{font-size:22px;font-weight:800;color:#070e1a;margin-bottom:2px}
  h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#00b4d8;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #00b4d8}
  .meta{font-size:11px;color:#7a9bb5;margin-bottom:24px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #070e1a}
  .badge{display:inline-block;background:#070e1a;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:4px;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}
  .price-big{font-size:28px;font-weight:800;color:#00b4d8}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
  .stat{background:#f4f7fb;border-radius:8px;padding:14px 16px}
  .stat-label{font-size:10px;color:#7a9bb5;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px}
  .stat-val{font-size:18px;font-weight:800;color:#1a2332}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}
  th{background:#f4f7fb;padding:9px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:#7a9bb5;font-weight:700;white-space:nowrap}
  td{padding:9px 12px;border-bottom:1px solid #eef0f3;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  .mine td{background:#f0fbff;font-weight:700}
  .mine td:first-child{color:#00b4d8}
  .chip{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
  .cheap{background:#d1fae5;color:#065f46}
  .mid{background:#fef3c7;color:#92400e}
  .exp{background:#fee2e2;color:#991b1b}
  .insight{display:flex;gap:12px;padding:12px 16px;background:#f4f7fb;border-radius:8px;margin-bottom:8px}
  .insight-icon{font-size:20px;flex-shrink:0}
  .insight-title{font-weight:700;font-size:13px;margin-bottom:3px}
  .insight-desc{font-size:12px;color:#4a6070;line-height:1.5}
  .rec{background:#070e1a;color:#fff;border-radius:10px;padding:18px 22px;margin-top:8px;line-height:1.7}
  .rec-label{font-size:10px;color:#00b4d8;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:8px}
  .spec-win{color:#065f46;font-weight:600}
  .spec-lose{color:#991b1b;font-weight:600}
  .footer{margin-top:36px;padding-top:16px;border-top:1px solid #eef0f3;font-size:11px;color:#7a9bb5;display:flex;justify-content:space-between}
  @media print{body{padding:20px 24px}}
</style></head><body>

<div class="header">
  <div>
    <div class="badge">${product.category}</div>
    <h1>${market?.product_name || product.name}</h1>
    <div class="meta">${market?.brand || product.brand || ""} ${market?.model || product.model || ""} &nbsp;·&nbsp; ${market?.category_label || ""}</div>
    ${market?.official_description ? `<div style="max-width:500px;color:#4a6070;line-height:1.6">${market.official_description}</div>` : ""}
  </div>
  <div style="text-align:right">
    ${product.myPrice ? `<div style="font-size:11px;color:#7a9bb5;margin-bottom:4px">MEU PREÇO</div><div class="price-big">${fmt(product.myPrice, product.currency)}</div>` : ""}
    <div style="font-size:11px;color:#7a9bb5;margin-top:8px">Gerado em ${date}</div>
    <div style="font-size:10px;color:#b0c0d0;margin-top:2px">PriceRadar · ${MODEL}</div>
  </div>
</div>

<div class="stats">
  <div class="stat"><div class="stat-label">Faixa do Mercado</div><div class="stat-val" style="font-size:14px">${fmt(market?.market_min_price, product.currency)} – ${fmt(market?.market_max_price, product.currency)}</div></div>
  <div class="stat"><div class="stat-label">Média do Mercado</div><div class="stat-val">${fmt(market?.market_avg_price, product.currency)}</div></div>
  <div class="stat"><div class="stat-label">Concorrentes</div><div class="stat-val">${comps.length}</div></div>
  <div class="stat"><div class="stat-label">Lojas Rastreadas</div><div class="stat-val">${stores.length}</div></div>
</div>

${market?.price_position_label ? `<div style="background:#e0f7fa;border-left:4px solid #00b4d8;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;color:#00616e;font-weight:600">📍 ${market.price_position_label}</div>` : ""}

<h2>Posicionamento de Preços</h2>
<table>
  <thead><tr><th>Produto</th><th>Mín</th><th>Média</th><th>Máx</th>${stores.map(s=>`<th>${s}</th>`).join("")}</tr></thead>
  <tbody>
    <tr class="mine">
      <td>⭐ ${market?.product_name || product.name}</td>
      <td>${fmt(Math.min(...(market?.my_product_stores||[]).map(p=>p.price).filter(Boolean)), product.currency)}</td>
      <td>${fmt(Math.round((market?.my_product_stores||[]).map(p=>p.price).filter(Boolean).reduce((a,b,_,arr)=>a+b/arr.length,0)), product.currency)}</td>
      <td>${fmt(Math.max(...(market?.my_product_stores||[]).map(p=>p.price).filter(Boolean)), product.currency)}</td>
      ${stores.map(s => { const e=(market?.my_product_stores||[]).find(p=>p.store===s); return `<td>${e?fmt(e.price,product.currency):"—"}</td>`; }).join("")}
    </tr>
    ${comps.map(c => `<tr>
      <td><strong>${c.name}</strong><br/><span style="color:#7a9bb5;font-size:11px">${c.brand||""}</span></td>
      <td>${fmt(c.min_price, product.currency)}</td>
      <td>${fmt(c.avg_price, product.currency)}</td>
      <td>${fmt(c.max_price, product.currency)}</td>
      ${stores.map(s => { const e=(c.prices_by_store||[]).find(p=>p.store===s); return `<td>${e?fmt(e.price,product.currency):"—"}</td>`; }).join("")}
    </tr>`).join("")}
  </tbody>
</table>

${allSpecKeys.size > 0 ? `
<h2>Especificações Técnicas</h2>
<table>
  <thead><tr><th>Especificação</th><th>⭐ ${market?.product_name || product.name}</th>${comps.filter(c=>c.specs&&Object.keys(c.specs).length).map(c=>`<th>${c.name}</th>`).join("")}</tr></thead>
  <tbody>
    ${Array.from(allSpecKeys).map(key => {
      const myVal = (mySpecs?.specs||{})[key];
      const cols = comps.filter(c=>c.specs&&Object.keys(c.specs).length);
      return `<tr>
        <td style="color:#7a9bb5;font-size:11px;white-space:nowrap">${key}</td>
        <td style="font-weight:600">${myVal||"—"}</td>
        ${cols.map(c => {
          const cv = c.specs?.[key];
          const n = v => parseFloat(String(v||"").replace(/[^\d.]/g,""));
          const a = n(myVal), b = n(cv);
          const cls = myVal&&cv&&!isNaN(a)&&!isNaN(b) ? (a>b?"spec-win":a<b?"spec-lose":"") : "";
          return `<td class="${cls}">${cv||"—"}</td>`;
        }).join("")}
      </tr>`;
    }).join("")}
  </tbody>
</table>` : ""}

${(market?.insights||[]).length > 0 ? `
<h2>Insights de Mercado</h2>
${market.insights.map(i=>`<div class="insight"><div class="insight-icon">${i.icon||"💡"}</div><div><div class="insight-title">${i.title}</div><div class="insight-desc">${i.description}</div></div></div>`).join("")}` : ""}

${market?.spec_gaps ? `<div style="background:#f4f7fb;border-radius:8px;padding:16px 18px;margin-top:16px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#7a9bb5;margin-bottom:8px">Análise de Lacunas Técnicas</div><div style="line-height:1.7;color:#4a6070">${market.spec_gaps}</div></div>` : ""}

${market?.recommendation ? `<h2>Recomendação Estratégica</h2><div class="rec"><div class="rec-label">Recomendação</div>${market.recommendation}</div>` : ""}

<div class="footer">
  <span>PriceRadar · Análise Competitiva</span>
  <span>${date}</span>
</div>

<script>window.onload = () => { window.print(); }</script>
</body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  const tabs = [
    { id:"spectrum", label:"📊 Posicionamento" },
    { id:"stores",   label:"🏪 Preços por Loja" },
    { id:"specs",    label:"🔬 Specs Técnicas"  },
    { id:"insights", label:"💡 Insights"        },
  ];

  return (
    <div style={{ maxWidth:1100,margin:"0 auto",padding:"28px 24px",animation:"slideR .3s ease" }}>

      {/* Breadcrumb */}
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:22,fontSize:13,color:"var(--text2)" }}>
        <button onClick={onBack} style={{ background:"none",border:"none",color:"var(--accent)",cursor:"pointer",fontSize:13,fontFamily:"'Syne',sans-serif",padding:0 }}>← Catálogo</button>
        <span style={{ color:"var(--text3)" }}>/</span>
        <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{product.name}</span>
        <span style={{ color:"var(--text3)" }}>/</span>
        <span>Análise</span>
      </div>

      {/* Product bar */}
      <div style={{ ...A.card,padding:"18px 24px",marginBottom:22,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap",borderTop:`3px solid ${color}` }}>
        <div style={{ flex:1,minWidth:200 }}>
          <div style={{ fontSize:11,color,fontFamily:"'Space Mono',monospace",letterSpacing:.8,textTransform:"uppercase",marginBottom:2 }}>{product.category}</div>
          <div style={{ fontSize:19,fontWeight:800 }}>{product.name}</div>
          {product.brand&&<div style={{ fontSize:12,color:"var(--text3)",marginTop:1 }}>{product.brand}{product.model?` · ${product.model}`:""}</div>}
        </div>
        {product.myPrice&&(
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11,color:"var(--text3)",fontFamily:"'Space Mono',monospace",marginBottom:2 }}>MEU PREÇO</div>
            <div style={{ fontSize:24,fontWeight:800,fontFamily:"'Space Mono',monospace",color }}>{fmt(product.myPrice,product.currency)}</div>
          </div>
        )}
        {/* Model badge */}
        <div style={{ fontSize:10,color:"var(--text3)",fontFamily:"'Space Mono',monospace",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 10px" }}>
          ⚡ {MODEL}
        </div>
        {phase==="idle"&&<button onClick={run} style={A.btnPrimary}>🔍 Iniciar Análise</button>}
        {phase==="done"&&<>
          <button onClick={run} style={{ ...A.btnGhost,fontSize:12 }}>🔄 Reanalisar</button>
          <button onClick={downloadPDF} style={{ ...A.btnPrimary,fontSize:12,background:"linear-gradient(135deg,#10b981,#059669)" }}>⬇️ Baixar PDF</button>
        </>}
      </div>

      {/* IDLE */}
      {phase==="idle"&&(
        <div style={{ ...A.card,padding:"52px 32px",textAlign:"center" }}>
          <div style={{ fontSize:48,opacity:.15,marginBottom:16 }}>📡</div>
          <div style={{ fontSize:17,fontWeight:700,color:"var(--text2)",marginBottom:8 }}>Pronto para analisar o mercado</div>
          <div style={{ fontSize:13,color:"var(--text3)",maxWidth:420,margin:"0 auto 24px",lineHeight:1.8 }}>
            O Claude vai buscar a ficha técnica, identificar concorrentes e rastrear preços atuais nas lojas em tempo real.
          </div>
          <button onClick={run} style={{ ...A.btnPrimary,margin:"0 auto" }}>🔍 Iniciar Análise de Mercado</button>
        </div>
      )}

      {/* LOADING */}
      {phase==="loading"&&(
        <div style={{ ...A.card,padding:"52px 32px",display:"flex",flexDirection:"column",alignItems:"center",gap:20 }}>
          <div style={{ width:58,height:58,border:"2px solid rgba(0,212,255,.12)",borderTop:"2px solid var(--accent)",borderRadius:"50%",animation:"spin 1s linear infinite" }} />
          <div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,color:"var(--accent)",animation:"pulse 2s infinite" }}>Mapeando o mercado com {MODEL}...</div>
          <div ref={logRef} style={{ background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 18px",maxHeight:220,overflowY:"auto",fontFamily:"'Space Mono',monospace",fontSize:12,lineHeight:1.9,width:"100%",maxWidth:520 }}>
            {logs.map((l,i) => (
              <div key={i} style={{ display:"flex",gap:10 }}>
                <span style={{ color:"var(--text3)",flexShrink:0 }}>[{l.ts}]</span>
                <span style={{ color:l.type==="ok"?"var(--accent3)":l.type==="search"?"var(--accent)":l.type==="wait"?"var(--warn)":"var(--text2)" }}>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ERROR */}
      {phase==="error"&&(
        <div style={{ ...A.card,padding:"36px 32px",textAlign:"center" }}>
          <div style={{ fontSize:36,marginBottom:12 }}>❌</div>
          <div style={{ fontSize:15,fontWeight:700,color:"var(--danger)",marginBottom:8 }}>Erro na análise</div>
          <div style={{ fontSize:13,color:"var(--text2)",marginBottom:20,maxWidth:420,margin:"0 auto 20px" }}>{error}</div>
          <button onClick={run} style={{ ...A.btnPrimary,margin:"0 auto" }}>Tentar novamente</button>
        </div>
      )}

      {/* DONE */}
      {phase==="done"&&market&&(
        <div style={{ display:"flex",flexDirection:"column",gap:16,animation:"fadeUp .4s ease" }}>

          {/* Stats */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
            {[
              { label:"FAIXA DO MERCADO", value:`${fmt(market.market_min_price,product.currency)} – ${fmt(market.market_max_price,product.currency)}`, color:"var(--warn)" },
              { label:"MÉDIA DO MERCADO", value:fmt(market.market_avg_price,product.currency), color:"var(--text2)" },
              { label:"CONCORRENTES",     value:comps.length, color:"var(--accent)" },
              { label:"LOJAS RASTREADAS", value:new Set([...(market.my_product_stores||[]),...comps.flatMap(c=>c.prices_by_store||[])].map(p=>p.store)).size, color:"var(--accent3)" },
            ].map(c => (
              <div key={c.label} style={{ ...A.card,padding:"16px 18px",position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:c.color }} />
                <div style={{ fontSize:10,color:"var(--text3)",fontFamily:"'Space Mono',monospace",letterSpacing:.5,marginBottom:6 }}>{c.label}</div>
                <div style={{ fontSize:typeof c.value==="number"?28:16,fontWeight:800,fontFamily:"'Space Mono',monospace",color:c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ ...A.card,overflow:"hidden" }}>
            <div style={{ display:"flex",borderBottom:"1px solid var(--border)",background:"rgba(0,0,0,0.2)",padding:"0 28px",overflowX:"auto" }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ background:"none",border:"none",cursor:"pointer",padding:"14px 20px",fontSize:13,fontWeight:700,whiteSpace:"nowrap",color:tab===t.id?"var(--accent)":"var(--text2)",borderBottom:tab===t.id?"2px solid var(--accent)":"2px solid transparent",transition:"all .2s",fontFamily:"'Syne',sans-serif" }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding:"28px 30px" }}>
              {tab==="spectrum"&&(
                <div style={{ display:"flex",flexDirection:"column",gap:28 }}>
                  <div>
                    <SLabel color="var(--accent)">Espectro de Preços do Mercado</SLabel>
                    <Spectrum myPrice={product.myPrice} myStorePrices={market.my_product_stores} competitors={comps} currency={product.currency} />
                    {market.price_position_label&&(
                      <div style={{ marginTop:20,padding:"13px 18px",background:"rgba(0,212,255,0.05)",border:"1px solid rgba(0,212,255,0.15)",borderRadius:8,fontSize:13,color:"var(--text2)",lineHeight:1.65 }}>
                        📍 <strong style={{ color:"var(--accent)" }}>Posicionamento: </strong>{market.price_position_label}
                      </div>
                    )}
                  </div>
                  <div>
                    <SLabel>Concorrentes Identificados</SLabel>
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:12 }}>
                      {comps.map((c,i) => (
                        <div key={i} style={{ background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px" }}>
                          <div style={{ fontSize:13,fontWeight:700,marginBottom:2 }}>{c.name}</div>
                          <div style={{ fontSize:11,color:"var(--text3)",marginBottom:10 }}>{c.brand}</div>
                          <div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:"var(--warn)",marginBottom:4 }}>
                            {fmt(c.min_price,product.currency)} – {fmt(c.max_price,product.currency)}
                          </div>
                          <div style={{ fontSize:11,color:"var(--text3)",marginBottom:8 }}>Média: {fmt(c.avg_price,product.currency)}</div>
                          {c.vs_my_product&&<div style={{ fontSize:12,color:"var(--text2)",lineHeight:1.5,borderTop:"1px solid var(--border)",paddingTop:8 }}>{c.vs_my_product}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab==="stores"&&(
                <div>
                  <SLabel>Produtos × Lojas</SLabel>
                  <StoreTable myProduct={product} myStorePrices={market.my_product_stores} competitors={comps} currency={product.currency} />
                </div>
              )}

              {tab==="specs"&&(
                <div>
                  <SLabel color="var(--accent2)">Especificações Técnicas — Produto × Produto</SLabel>
                  <SpecTable myName={mySpecs?.product_name||product.name} mySpecs={mySpecs?.specs||{}} competitors={comps} />
                  {market.spec_gaps&&(
                    <div style={{ marginTop:20,padding:"16px 20px",background:"rgba(124,58,237,0.07)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:10,fontSize:13,lineHeight:1.75 }}>
                      <div style={{ color:"#a78bfa",fontWeight:700,fontSize:10,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8 }}>Análise de Lacunas Técnicas</div>
                      {market.spec_gaps}
                    </div>
                  )}
                </div>
              )}

              {tab==="insights"&&(
                <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
                  <SLabel>Insights de Mercado</SLabel>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12 }}>
                    {(market.insights||[]).map((ins,i) => (
                      <div key={i} style={{ background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,padding:"18px 20px",display:"flex",gap:14 }}>
                        <div style={{ fontSize:24,flexShrink:0 }}>{ins.icon}</div>
                        <div>
                          <div style={{ fontWeight:700,fontSize:13,marginBottom:6 }}>{ins.title}</div>
                          <div style={{ fontSize:12,color:"var(--text2)",lineHeight:1.6 }}>{ins.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {market.recommendation&&(
                    <div style={{ padding:"18px 22px",background:"rgba(124,58,237,0.07)",border:"1px solid rgba(124,58,237,0.22)",borderRadius:12,fontSize:13,lineHeight:1.8 }}>
                      <div style={{ color:"#a78bfa",fontWeight:700,fontSize:10,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>Recomendação Estratégica</div>
                      {market.recommendation}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ROOT — NAVIGATION
═══════════════════════════════════════════════ */
export default function App() {
  const [apiKey, setApiKey]       = useState(() => sessionStorage.getItem("pr_anthropic_key") || "");
  const [products, setProducts]   = useLocalStorage("priceradar_products", []);
  const [screen, setScreen]       = useState("catalog");
  const [editing, setEditing]     = useState(null);
  const [analyzing, setAnalyzing] = useState(null);

  const saveKey = k => { sessionStorage.setItem("pr_anthropic_key", k); setApiKey(k); };

  if (!apiKey) return <><style>{STYLE}</style><ApiKeyScreen onSave={saveKey} /></>;

  const handleNew     = ()  => { setEditing(null);  setScreen("form"); };
  const handleEdit    = (p) => { setEditing(p);      setScreen("form"); };
  const handleDelete  = (id)=> setProducts(ps => ps.filter(p => p.id !== id));
  const handleSave    = (p) => {
    setProducts(ps => editing ? ps.map(x => x.id===p.id ? p : x) : [...ps, p]);
    setScreen("catalog");
  };
  const handleAnalyze = (p) => { setAnalyzing(p); setScreen("analysis"); };

  return (
    <>
      <style>{STYLE}</style>
      <style>{`
        input:focus,select:focus,textarea:focus{outline:none;border-color:var(--accent)!important;box-shadow:0 0 0 3px rgba(0,212,255,0.09)}
        button{transition:opacity .15s,transform .1s}
        button:active{transform:scale(0.97)}
      `}</style>

      {/* TOPBAR */}
      <header style={{ position:"sticky",top:0,zIndex:100,padding:"12px 28px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:14,background:"rgba(7,14,26,0.95)",backdropFilter:"blur(14px)" }}>
        <button onClick={() => setScreen("catalog")} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,padding:0 }}>
          <div style={{ width:32,height:32,background:"linear-gradient(135deg,var(--accent),var(--accent2))",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>📡</div>
          <div style={{ fontSize:18,fontWeight:800,letterSpacing:-.5,color:"var(--text)" }}>Price<span style={{ color:"var(--accent)" }}>Radar</span></div>
        </button>

        <div style={{ display:"flex",gap:4,marginLeft:8 }}>
          {[
            { id:"catalog",  label:"📦 Catálogo" },
            ...(screen==="form"     ? [{ id:"form",     label: editing?"✏️ Editar":"＋ Novo" }] : []),
            ...(screen==="analysis" ? [{ id:"analysis", label:`📊 ${analyzing?.name}` }] : []),
          ].map(n => (
            <button key={n.id} onClick={() => n.id==="catalog" && setScreen("catalog")}
              style={{ background:screen===n.id?"rgba(0,212,255,0.1)":"none", border:screen===n.id?"1px solid rgba(0,212,255,0.2)":"1px solid transparent", color:screen===n.id?"var(--accent)":"var(--text2)", padding:"5px 14px", borderRadius:6, fontSize:12, fontFamily:"'Syne',sans-serif", fontWeight:600, cursor:"pointer", maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {n.label}
            </button>
          ))}
        </div>

        {/* Model badge */}
        <div style={{ fontSize:10,color:"var(--accent3)",fontFamily:"'Space Mono',monospace",background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:5,padding:"4px 10px",letterSpacing:.5 }}>
          ⚡ {MODEL}
        </div>

        <button onClick={() => { sessionStorage.removeItem("pr_anthropic_key"); setApiKey(""); }}
          style={{ marginLeft:"auto",background:"none",border:"1px solid var(--border)",color:"var(--text3)",cursor:"pointer",padding:"5px 12px",borderRadius:6,fontSize:11,fontFamily:"'Space Mono',monospace" }}>
          🔑 Chave
        </button>
      </header>

      <div style={{ position:"relative",zIndex:1,minHeight:"calc(100vh - 54px)" }}>
        {screen==="catalog"  && <CatalogScreen products={products} onNew={handleNew} onEdit={handleEdit} onDelete={handleDelete} onAnalyze={handleAnalyze} />}
        {screen==="form"     && <ProductFormScreen initial={editing} onSave={handleSave} onCancel={() => setScreen("catalog")} />}
        {screen==="analysis" && analyzing && <AnalysisScreen product={analyzing} apiKey={apiKey} onBack={() => setScreen("catalog")} />}
      </div>
    </>
  );
}
