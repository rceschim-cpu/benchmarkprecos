import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════ */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
  :root {
    --bg:#080f1c; --bg2:#0b1422; --bg3:#0e1a2e;
    --sidebar:#070d1a; --border:#172338; --border2:#1e2e45;
    --accent:#00d4ff; --accent2:#7c3aed; --accent3:#10b981;
    --warn:#f59e0b; --danger:#f43f5e;
    --text:#ddeeff; --text2:#7a9bb5; --text3:#3d5a70;
    --card:#0c1929; --rpanel:#040c18;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body,#root { height:100%; }
  body { background:var(--bg); color:var(--text); font-family:'Syne',sans-serif; overflow:hidden; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:3px; }
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
  input:focus,select:focus,textarea:focus { outline:none; border-color:var(--accent)!important; box-shadow:0 0 0 3px rgba(0,212,255,0.08); }
  button { font-family:'Syne',sans-serif; transition:opacity .15s,transform .1s; }
  button:active { transform:scale(0.97); }
`;

/* ═══════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════ */
const OPENAI_MODELS = [
  { id:"gpt-4o-mini",      name:"GPT-4o mini",     cost:"~$0,01", costColor:"#10b981", desc:"Rápido e barato." },
  { id:"gpt-4o",           name:"GPT-4o",           cost:"~$0,10", costColor:"#f59e0b", desc:"Melhor qualidade." },
  { id:"gpt-4.1-mini",     name:"GPT-4.1 mini",    cost:"~$0,02", costColor:"#10b981", desc:"Mais inteligente." },
  { id:"gpt-4.1",          name:"GPT-4.1",          cost:"~$0,12", costColor:"#f59e0b", desc:"Alta precisão." },
  { id:"gpt-4.5-preview",  name:"GPT-4.5 preview",  cost:"~$1,50", costColor:"#f43f5e", desc:"Máxima qualidade." },
];

const PROVIDERS = {
  claude: { id:"claude", name:"Claude Haiku", badge:"Anthropic", model:"claude-haiku-4-5-20251001", color:"#cc785c", keyHint:"sk-ant-api03-...", docsUrl:"https://console.anthropic.com/settings/keys", validateKey:k=>k.startsWith("sk-ant") },
  openai: { id:"openai", name:"OpenAI",       badge:"OpenAI",    model:"gpt-4o-mini",               color:"#10a37f", keyHint:"sk-proj-...",      docsUrl:"https://platform.openai.com/api-keys",       validateKey:k=>k.startsWith("sk-") },
};

const CAT_COLORS = { "Smartphones":"#00d4ff","Notebooks":"#a78bfa","TVs":"#f59e0b","Tablets":"#10b981","Fones":"#f43f5e","Câmeras":"#fb923c","Áudio":"#38bdf8","Máquinas de Pagamento":"#818cf8","Geral":"#7a9bb5" };
const CAT_ICONS  = { "Smartphones":"📱","Notebooks":"💻","TVs":"📺","Tablets":"📟","Fones":"🎧","Câmeras":"📷","Áudio":"🔊","Máquinas de Pagamento":"💳","Geral":"📦" };
const CATEGORIES = ["Smartphones","Notebooks","TVs","Tablets","Fones","Câmeras","Áudio","Máquinas de Pagamento","Geral"];
const EMPTY_FORM = { name:"",brand:"",model:"",category:"Geral",myPrice:"",currency:"BRL",ean:"",description:"",specs:"",competitorBrands:"" };
const COMP_COLORS = ["#f43f5e","#f59e0b","#10b981","#a78bfa","#fb923c","#38bdf8"];

const catColor = cat => CAT_COLORS[cat] || "#7a9bb5";
const catIcon  = cat => CAT_ICONS[cat]  || "📦";

/* ═══════════════════════════════════════════════
   ATOMS
═══════════════════════════════════════════════ */
const A = {
  label:      { fontSize:11, color:"var(--text2)", letterSpacing:.5, marginBottom:5, display:"block" },
  input:      { width:"100%", background:"var(--bg3)", border:"1px solid var(--border2)", color:"var(--text)", padding:"10px 14px", borderRadius:8, fontFamily:"'Syne',sans-serif", fontSize:13, outline:"none" },
  btnPrimary: { background:"linear-gradient(135deg,var(--accent),var(--accent2))", color:"#000", border:"none", padding:"11px 22px", borderRadius:9, fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:800, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:8 },
  btnGhost:   { background:"none", border:"1px solid var(--border2)", color:"var(--text2)", padding:"9px 18px", borderRadius:8, fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:600, cursor:"pointer" },
  card:       { background:"var(--card)", border:"1px solid var(--border)", borderRadius:12 },
};
const TH = { padding:"9px 12px", fontSize:10, letterSpacing:1, textTransform:"uppercase", color:"var(--text2)", fontFamily:"'Space Mono',monospace", borderBottom:"1px solid var(--border)", textAlign:"center", whiteSpace:"nowrap", fontWeight:700 };
const TD = { padding:"11px 12px", verticalAlign:"middle" };

function SLabel({ children, color }) {
  return (
    <div style={{ fontSize:10, letterSpacing:2.5, textTransform:"uppercase", color:color||"var(--text3)", fontFamily:"'Space Mono',monospace", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
      {children}<div style={{ flex:1, height:1, background:color?`${color}30`:"var(--border)" }}/>
    </div>
  );
}

function CardBtn({ label, onClick, hov, clr, bold, notLast }) {
  const [h, setH] = useState(false);
  return (
    <>
      <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
        style={{ flex:1, background:h?hov:"none", border:"none", color:h&&clr?clr:"var(--text2)", cursor:"pointer", padding:"10px 0", fontSize:11, fontWeight:bold?700:500, transition:"all .15s" }}>
        {label}
      </button>
      {notLast && <div style={{ width:1, background:"var(--border)" }}/>}
    </>
  );
}

/* ═══════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════ */
function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => { try { const s=localStorage.getItem(key); return s?JSON.parse(s):init; } catch { return init; } });
  const set = v => { const next=typeof v==="function"?v(val):v; setVal(next); try { localStorage.setItem(key,JSON.stringify(next)); } catch {} };
  return [val, set];
}
const getHistory   = id  => { try { return JSON.parse(localStorage.getItem(`pr_h_${id}`))||[]; } catch { return []; } };
const clearHistory = id  => { try { localStorage.removeItem(`pr_h_${id}`); } catch {} };
const saveToHistory = (id, data) => {
  const entry = { ...data, histId:Date.now(), cachedAt:new Date().toISOString() };
  const list  = [entry, ...getHistory(id)].slice(0,20);
  try { localStorage.setItem(`pr_h_${id}`, JSON.stringify(list)); } catch {}
};

function fmt(price, currency="BRL") {
  if (!price && price!==0) return "—";
  return new Intl.NumberFormat(currency==="BRL"?"pt-BR":"en-US", { style:"currency", currency, maximumFractionDigits:0 }).format(price);
}

/* ═══════════════════════════════════════════════
   API
═══════════════════════════════════════════════ */
function parseJSON(text) {
  const s=text.indexOf("{"), e=text.lastIndexOf("}");
  if (s===-1||e===-1) throw new Error("Nenhum JSON na resposta");
  let raw = text.slice(s,e+1)
    .replace(/\/\/[^\n]*/g,"").replace(/\/\*[\s\S]*?\*\//g,"")
    .replace(/,(\s*[}\]])/g,"$1").replace(/[\u0000-\u001F\u007F]/g," ");
  try { return JSON.parse(raw); } catch {}
  const stack=[]; let inStr=false, esc=false;
  for (const c of raw) {
    if (esc) { esc=false; continue; }
    if (c==="\\"&&inStr) { esc=true; continue; }
    if (c==='"') { inStr=!inStr; continue; }
    if (inStr) continue;
    if (c==="{"||c==="[") stack.push(c==="{"?"}":"]");
    else if (c==="}"||c==="]") stack.pop();
  }
  raw = raw.replace(/,?\s*"[^"]*"\s*:\s*[^,}\]]*$/,"").replace(/,?\s*"[^"]*"\s*$/,"") + stack.reverse().join("");
  try { return JSON.parse(raw); } catch (err) { throw new Error(`JSON inválido: ${err.message}`); }
}

async function callClaude(apiKey, sys, usr) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-api-key":apiKey, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
    body:JSON.stringify({ model:PROVIDERS.claude.model, max_tokens:3000, system:sys, messages:[{role:"user",content:usr}] }),
  });
  if (!r.ok) { const e=await r.json(); throw new Error(e.error?.message||`HTTP ${r.status}`); }
  const d = await r.json();
  return parseJSON(d.content.filter(b=>b.type==="text").map(b=>b.text).join(""));
}

async function callOpenAI(apiKey, model, sys, usr) {
  // Step 1: web search — free text
  const r1 = await fetch("https://api.openai.com/v1/responses", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${apiKey}` },
    body:JSON.stringify({ model, tools:[{type:"web_search_preview"}], instructions:sys, input:usr, max_output_tokens:4000 }),
  });
  if (!r1.ok) { const e=await r1.json(); throw new Error(e.error?.message||`HTTP ${r1.status}`); }
  const d1 = await r1.json();
  const research = (d1.output||[]).filter(o=>o.type==="message").flatMap(o=>(o.content||[]).filter(c=>c.type==="output_text").map(c=>c.text)).join("");

  // Step 2: format as JSON (json_object guarantees valid output)
  const r2 = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${apiKey}` },
    body:JSON.stringify({
      model,
      response_format:{ type:"json_object" },
      max_tokens:4000,
      messages:[
        { role:"system", content:`Extraia dados de mercado e retorne JSON com estas chaves:
product_name, brand, model, official_description, specs(obj), category_label,
market_min_price, market_max_price, market_avg_price,
my_product_stores([{store,price,url,installments}]), price_position_label,
competitors([{name,brand,min_price,max_price,avg_price,prices_by_store:[{store,price,url}],specs(obj),vs_my_product}]),
insights([{icon,title,description}]), spec_gaps, recommendation.
Números sem dado=0. Strings sem dado="".` },
        { role:"user", content:research.slice(0,5000) },
      ],
    }),
  });
  if (!r2.ok) { const e=await r2.json(); throw new Error(e.error?.message||`HTTP ${r2.status}`); }
  const d2 = await r2.json();
  try { return JSON.parse(d2.choices?.[0]?.message?.content||"{}"); }
  catch (err) { throw new Error(`JSON inválido: ${err.message}`); }
}

async function runAnalysis(provider, apiKey, model, product, onLog) {
  onLog("🔍 Pesquisando mercado...", "search");
  const brandHint = product.competitorBrands?.trim() ? `Concorrentes preferidos: ${product.competitorBrands}.` : "";
  const isOpenAI  = provider==="openai";

  if (isOpenAI) {
    onLog("🌐 Buscando preços nas lojas...", "search");
    const sys = "Analista de mercado brasileiro. Use web search para preços REAIS e ATUAIS.";
    const usr = `Produto: ${product.name}${product.brand?` (${product.brand}${product.model?" "+product.model:""})`:""}
Categoria: ${product.category} | Meu preço: ${product.myPrice?fmt(product.myPrice,product.currency):"N/A"}
${brandHint}
Pesquise: specs técnicas, preços atuais (Mercado Livre, Americanas, Amazon BR, Magazine Luiza, Casas Bahia, KaBuM) e 2 concorrentes.`;
    onLog("📋 Estruturando dados...", "search");
    const result = await callOpenAI(apiKey, model, sys, usr);
    onLog(`✓ ${Object.keys(result.specs||{}).length} specs | ${result.competitors?.length||0} concorrentes`, "ok");
    return result;
  } else {
    const sys = "Especialista em mercado brasileiro. Responda APENAS JSON válido, sem markdown.";
    const usr = `Produto: ${product.name}${product.brand?` (${product.brand}${product.model?" "+product.model:""})`:""}
Categoria: ${product.category} | Meu preço: ${product.myPrice?fmt(product.myPrice,product.currency):"N/A"}
${brandHint}
Forneça specs técnicas, preços aproximados (ML/Americanas/Amazon BR/MagaLu/Casas Bahia/KaBuM) e 2 concorrentes.
JSON:{"product_name":"","brand":"","model":"","official_description":"","specs":{},"category_label":"","market_min_price":0,"market_max_price":0,"market_avg_price":0,"my_product_stores":[{"store":"","price":0,"url":"","installments":""}],"price_position_label":"","competitors":[{"name":"","brand":"","min_price":0,"max_price":0,"avg_price":0,"prices_by_store":[{"store":"","price":0,"url":""}],"specs":{},"vs_my_product":""}],"insights":[{"icon":"","title":"","description":""}],"spec_gaps":"","recommendation":""}`;
    const result = await callClaude(apiKey, sys, usr);
    onLog(`✓ ${Object.keys(result.specs||{}).length} specs | ${result.competitors?.length||0} concorrentes`, "ok");
    return result;
  }
}

/* ═══════════════════════════════════════════════
   CHARTS
═══════════════════════════════════════════════ */
function Spectrum({ myPrice, myStorePrices, competitors, currency }) {
  const all = [myPrice, ...(myStorePrices||[]).map(p=>p.price), ...(competitors||[]).flatMap(c=>[c.min_price,c.max_price])].filter(p=>p>0);
  if (!all.length) return null;
  const gMin=Math.min(...all)*.96, gMax=Math.max(...all)*1.04, range=gMax-gMin||1;
  const pct = v => Math.min(100,Math.max(0,((v-gMin)/range)*100));
  return (
    <div>
      <div style={{ position:"relative", height:60, marginBottom:8 }}>
        <div style={{ position:"absolute", left:0, right:0, top:"50%", transform:"translateY(-50%)", height:8, borderRadius:4, background:"linear-gradient(90deg,var(--accent3),var(--warn),var(--danger))" }}/>
        {(competitors||[]).map((c,i) => {
          if (!c.min_price||!c.max_price) return null;
          const l=pct(c.min_price), r=pct(c.max_price), col=COMP_COLORS[i%COMP_COLORS.length];
          return <div key={i} style={{ position:"absolute", left:`${l}%`, width:`${r-l}%`, top:"50%", transform:"translateY(-50%)", height:14, background:`${col}30`, border:`1px solid ${col}60`, borderRadius:3 }}/>;
        })}
        {(competitors||[]).map((c,i) => c.avg_price ? <div key={i} style={{ position:"absolute", left:`${pct(c.avg_price)}%`, top:"50%", transform:"translate(-50%,-50%)", width:10, height:10, borderRadius:"50%", background:COMP_COLORS[i%COMP_COLORS.length], border:"2px solid var(--bg)", zIndex:2 }}/> : null)}
        {myPrice>0 && (
          <div style={{ position:"absolute", left:`${pct(myPrice)}%`, top:0, transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", zIndex:5 }}>
            <div style={{ fontSize:10, fontFamily:"'Space Mono',monospace", fontWeight:700, color:"var(--accent)", whiteSpace:"nowrap", background:"var(--bg)", padding:"1px 5px", borderRadius:4, marginBottom:2 }}>{fmt(myPrice,currency)}</div>
            <div style={{ width:12, height:12, borderRadius:"50%", background:"var(--accent)", border:"2px solid var(--bg)", boxShadow:"0 0 10px var(--accent)" }}/>
          </div>
        )}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, fontFamily:"'Space Mono',monospace", color:"var(--text3)", marginBottom:16 }}>
        <span>{fmt(gMin,currency)}</span><span>{fmt(gMax,currency)}</span>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
        {myPrice>0 && <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:12 }}><div style={{ width:10, height:10, borderRadius:"50%", background:"var(--accent)", boxShadow:"0 0 6px rgba(0,212,255,.7)" }}/><span style={{ color:"var(--accent)", fontWeight:700 }}>⭐ Meu produto</span></div>}
        {(competitors||[]).map((c,i) => <div key={i} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12 }}><div style={{ width:10, height:10, borderRadius:"50%", background:COMP_COLORS[i%COMP_COLORS.length] }}/><span style={{ color:"var(--text2)" }}>{c.name}</span></div>)}
      </div>
    </div>
  );
}

function StoreTable({ myProduct, myStorePrices, competitors, currency }) {
  const storeSet = new Set();
  (myStorePrices||[]).forEach(p=>storeSet.add(p.store));
  (competitors||[]).forEach(c=>(c.prices_by_store||[]).forEach(p=>storeSet.add(p.store)));
  const stores = Array.from(storeSet);
  const allP   = [...(myStorePrices||[]).map(p=>p.price),...(competitors||[]).flatMap(c=>(c.prices_by_store||[]).map(p=>p.price))].filter(Boolean);
  const pMin=Math.min(...allP), pMax=Math.max(...allP);
  const cellClr = p => !p||pMax===pMin?"var(--text)":(p-pMin)/(pMax-pMin)<.25?"var(--accent3)":(p-pMin)/(pMax-pMin)>.75?"var(--danger)":"var(--warn)";
  const rows = [{label:"⭐ "+myProduct.name,pricesByStore:myStorePrices,isMine:true},...(competitors||[]).map(c=>({label:c.name,pricesByStore:c.prices_by_store,isMine:false}))];
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
        <thead><tr>
          <th style={{ ...TH, textAlign:"left", minWidth:160, background:"rgba(0,0,0,.3)" }}>Produto</th>
          <th style={{ ...TH, color:"var(--accent3)", background:"rgba(0,0,0,.3)" }}>Mín</th>
          <th style={{ ...TH, background:"rgba(0,0,0,.3)" }}>Média</th>
          <th style={{ ...TH, color:"var(--danger)", background:"rgba(0,0,0,.3)" }}>Máx</th>
          {stores.map(s=><th key={s} style={{ ...TH, background:"rgba(0,0,0,.18)" }}>{s}</th>)}
        </tr></thead>
        <tbody>{rows.map((row,ri) => {
          const prices=(row.pricesByStore||[]).map(p=>p.price).filter(Boolean);
          const rMin=prices.length?Math.min(...prices):null, rMax=prices.length?Math.max(...prices):null;
          const rAvg=prices.length?Math.round(prices.reduce((a,b)=>a+b,0)/prices.length):null;
          return (
            <tr key={ri} style={{ background:row.isMine?"rgba(0,212,255,0.05)":ri%2===0?"rgba(255,255,255,.008)":"transparent", borderBottom:"1px solid rgba(23,35,56,.7)" }}>
              <td style={{ ...TD, fontWeight:row.isMine?700:500, color:row.isMine?"var(--accent)":"var(--text)" }}>{row.label}</td>
              <td style={{ ...TD, fontFamily:"'Space Mono',monospace", color:"var(--accent3)", textAlign:"center", fontWeight:700 }}>{fmt(rMin,currency)}</td>
              <td style={{ ...TD, fontFamily:"'Space Mono',monospace", color:"var(--text2)", textAlign:"center" }}>{fmt(rAvg,currency)}</td>
              <td style={{ ...TD, fontFamily:"'Space Mono',monospace", color:"var(--danger)", textAlign:"center", fontWeight:700 }}>{fmt(rMax,currency)}</td>
              {stores.map(store => {
                const entry=(row.pricesByStore||[]).find(p=>p.store===store);
                return (
                  <td key={store} style={{ ...TD, textAlign:"center" }}>
                    {entry ? <div>
                      <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, color:cellClr(entry.price) }}>{fmt(entry.price,currency)}</div>
                      {entry.installments&&<div style={{ fontSize:10, color:"var(--text3)", marginTop:1 }}>{entry.installments}</div>}
                      {entry.url&&<a href={entry.url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:"var(--accent)", textDecoration:"none", opacity:.7 }}>↗</a>}
                    </div> : <span style={{ color:"var(--text3)" }}>—</span>}
                  </td>
                );
              })}
            </tr>
          );
        })}</tbody>
      </table>
      <div style={{ marginTop:8, fontSize:11, color:"var(--text3)", fontFamily:"'Space Mono',monospace" }}>
        <span style={{ color:"var(--accent3)" }}>■ mais barato</span>&nbsp;
        <span style={{ color:"var(--warn)" }}>■ intermediário</span>&nbsp;
        <span style={{ color:"var(--danger)" }}>■ mais caro</span>
      </div>
    </div>
  );
}

function SpecTable({ myName, mySpecs, competitors }) {
  if (!mySpecs||!Object.keys(mySpecs).length) return <div style={{ color:"var(--text3)", fontSize:13 }}>Specs não disponíveis.</div>;
  const allKeys=new Set(Object.keys(mySpecs));
  competitors.forEach(c=>{ if(c.specs) Object.keys(c.specs).forEach(k=>allKeys.add(k)); });
  const cols=competitors.filter(c=>c.specs&&Object.keys(c.specs).length>0);
  if (!cols.length) return <div style={{ color:"var(--text3)", fontSize:13 }}>Specs dos concorrentes não disponíveis.</div>;
  const sc=(a,b)=>{ if(!a||!b)return"n"; const n=v=>parseFloat(String(v).replace(/[^\d.]/g,"")); const x=n(a),y=n(b); if(isNaN(x)||isNaN(y))return a.toLowerCase()===b.toLowerCase()?"eq":"n"; return x>y?"win":x<y?"lose":"eq"; };
  const bg ={win:"rgba(16,185,129,.09)",lose:"rgba(244,63,94,.08)",eq:"rgba(0,212,255,.05)",n:"transparent"};
  const clr={win:"var(--accent3)",lose:"var(--danger)",eq:"var(--accent)",n:"var(--text2)"};
  const ico={win:"↑ ",lose:"↓ ",eq:"≈ ",n:""};
  return (
    <div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead><tr>
            <th style={{ ...TH, textAlign:"left", minWidth:140, background:"rgba(0,0,0,.3)" }}>Especificação</th>
            <th style={{ ...TH, background:"rgba(0,212,255,0.07)", color:"var(--accent)", borderBottom:"2px solid var(--accent)" }}>⭐ {myName}</th>
            {cols.map((c,i)=><th key={i} style={{ ...TH, background:"rgba(0,0,0,.12)" }}>{c.name}</th>)}
          </tr></thead>
          <tbody>{Array.from(allKeys).map(key=>(
            <tr key={key} style={{ borderBottom:"1px solid rgba(23,35,56,.6)" }}>
              <td style={{ ...TD, fontFamily:"'Space Mono',monospace", fontSize:11, color:"var(--text3)", background:"rgba(0,0,0,.18)", whiteSpace:"nowrap" }}>{key}</td>
              <td style={{ ...TD, fontWeight:600, background:"rgba(0,212,255,0.04)" }}>{mySpecs[key]||<span style={{ color:"var(--text3)" }}>—</span>}</td>
              {cols.map((c,i)=>{ const cv=c.specs?.[key]; const s=mySpecs[key]&&cv?sc(mySpecs[key],cv):"n"; return <td key={i} style={{ ...TD, background:bg[s] }}>{cv?<span style={{ color:clr[s] }}>{ico[s]}{cv}</span>:<span style={{ color:"var(--text3)" }}>—</span>}</td>; })}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ marginTop:8, fontSize:11, color:"var(--text3)", fontFamily:"'Space Mono',monospace" }}>
        <span style={{ color:"var(--accent3)" }}>↑ meu melhor</span>&nbsp;
        <span style={{ color:"var(--danger)" }}>↓ concorrente melhor</span>&nbsp;
        <span style={{ color:"var(--accent)" }}>≈ equivalente</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════ */
function LoginScreen({ onSave }) {
  const [provider, setProvider] = useState("openai");
  const [model,    setModel]    = useState("gpt-4o-mini");
  const [key,      setKey]      = useState("");
  const [show,     setShow]     = useState(false);
  const p = PROVIDERS[provider];
  const isValid = p.validateKey(key);
  const selM = OPENAI_MODELS.find(m=>m.id===model)||OPENAI_MODELS[0];

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"var(--bg)" }}>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", background:"linear-gradient(rgba(0,212,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.018) 1px,transparent 1px)", backgroundSize:"48px 48px" }}/>
      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:860, display:"grid", gridTemplateColumns:"1fr 300px", gap:16, alignItems:"start" }}>
        {/* LEFT */}
        <div style={{ ...A.card, padding:"28px", display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:42, height:42, background:"linear-gradient(135deg,var(--accent),var(--accent2))", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📡</div>
            <div>
              <div style={{ fontSize:22, fontWeight:800 }}>Price<span style={{ color:"var(--accent)" }}>Radar</span></div>
              <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"'Space Mono',monospace", letterSpacing:2, marginTop:3 }}>POSICIONAMENTO COMPETITIVO</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize:10, color:"var(--text3)", marginBottom:8, letterSpacing:1.5, fontFamily:"'Space Mono',monospace" }}>PROVEDOR</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {Object.values(PROVIDERS).map(pv=>(
                <button key={pv.id} onClick={()=>{ setProvider(pv.id); setKey(""); setModel(pv.id==="openai"?"gpt-4o-mini":pv.model); }}
                  style={{ padding:"12px 14px", borderRadius:10, border:`2px solid ${provider===pv.id?pv.color:"var(--border2)"}`, background:provider===pv.id?`${pv.color}10`:"var(--bg3)", cursor:"pointer", display:"flex", alignItems:"center", gap:10, textAlign:"left" }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:provider===pv.id?pv.color:"var(--text3)", flexShrink:0 }}/>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:provider===pv.id?pv.color:"var(--text2)" }}>{pv.badge}</div>
                    <div style={{ fontSize:10, color:pv.id==="claude"?"var(--warn)":"var(--accent3)", fontFamily:"'Space Mono',monospace", marginTop:2 }}>{pv.id==="claude"?"sem tempo real":"web search ✓"}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {provider==="openai" && (
            <div>
              <div style={{ fontSize:10, color:"var(--text3)", marginBottom:8, letterSpacing:1.5, fontFamily:"'Space Mono',monospace" }}>MODELO</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                {OPENAI_MODELS.map(m=>{
                  const sel=model===m.id;
                  return (
                    <button key={m.id} onClick={()=>setModel(m.id)}
                      style={{ padding:"10px 11px", borderRadius:8, border:`1.5px solid ${sel?"#10a37f":"var(--border2)"}`, background:sel?"rgba(16,163,127,0.1)":"var(--bg3)", cursor:"pointer", textAlign:"left", display:"flex", flexDirection:"column", gap:3 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:sel?"var(--text)":"var(--text2)", lineHeight:1.2 }}>{m.name}</div>
                      <div style={{ fontSize:10, fontFamily:"'Space Mono',monospace", fontWeight:700, color:m.costColor }}>{m.cost}</div>
                      <div style={{ fontSize:10, color:"var(--text3)", lineHeight:1.3 }}>{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {/* RIGHT */}
        <div style={{ ...A.card, padding:"28px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--text)", marginBottom:4 }}>{p.badge} API Key</div>
            <a href={p.docsUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:p.color, textDecoration:"none" }}>↗ Obter chave</a>
          </div>
          <div style={{ position:"relative" }}>
            <input type={show?"text":"password"} value={key} onChange={e=>setKey(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&isValid&&onSave(provider,key,model)}
              placeholder={p.keyHint}
              style={{ ...A.input, paddingRight:40, fontFamily:"'Space Mono',monospace", fontSize:11 }}/>
            <button onClick={()=>setShow(s=>!s)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--text3)", cursor:"pointer", fontSize:14 }}>{show?"🙈":"👁"}</button>
          </div>
          <div style={{ background:"var(--bg3)", borderRadius:8, padding:"10px 12px", fontSize:11, color:"var(--text3)", lineHeight:1.8 }}>
            <div><span style={{ color:"var(--text2)" }}>Provedor:</span> {p.badge}</div>
            {provider==="openai"&&<><div><span style={{ color:"var(--text2)" }}>Modelo:</span> {selM.name}</div><div><span style={{ color:"var(--text2)" }}>Custo est.:</span> <span style={{ color:selM.costColor, fontWeight:700 }}>{selM.cost}/análise</span></div></>}
            {provider==="claude"&&<div style={{ color:"var(--warn)", fontSize:10, marginTop:2 }}>⚠️ Preços aproximados, sem web search</div>}
          </div>
          <button onClick={()=>isValid&&onSave(provider,key,model)} disabled={!isValid}
            style={{ ...A.btnPrimary, width:"100%", justifyContent:"center", opacity:isValid?1:.35, background:isValid?`linear-gradient(135deg,${p.color},${p.color}88)`:"var(--border2)", color:isValid?"#fff":"var(--text3)" }}>
            Entrar →
          </button>
          <div style={{ fontSize:10, color:"var(--text3)", textAlign:"center" }}>🔒 Chave salva no sessionStorage</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PRODUCT FORM
═══════════════════════════════════════════════ */
function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial||EMPTY_FORM);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const isEdit = !!initial?.id;
  const save = () => { if(!form.name.trim())return alert("Informe o nome."); onSave({...form,id:initial?.id||Date.now(),myPrice:parseFloat(form.myPrice)||null}); };
  return (
    <div style={{ padding:"24px 28px", maxWidth:680, margin:"0 auto", animation:"fadeIn .3s ease" }}>
      <div style={{ fontSize:18, fontWeight:800, marginBottom:22 }}>{isEdit?"✏️ Editar Produto":"📦 Cadastrar Produto"}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ ...A.card, padding:"20px 24px" }}>
          <SLabel>Identificação</SLabel>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ gridColumn:"1/-1" }}><label style={A.label}>Nome *</label><input style={A.input} value={form.name} onChange={set("name")} placeholder="Ex: Infinix Note 50x 128GB"/></div>
            <div><label style={A.label}>Marca</label><input style={A.input} value={form.brand} onChange={set("brand")} placeholder="Ex: Infinix"/></div>
            <div><label style={A.label}>Modelo / SKU</label><input style={A.input} value={form.model} onChange={set("model")} placeholder="Ex: Note 50x"/></div>
            <div><label style={A.label}>Categoria</label><select style={A.input} value={form.category} onChange={set("category")}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={A.label}>EAN</label><input style={A.input} value={form.ean} onChange={set("ean")} placeholder="7891234567890"/></div>
          </div>
        </div>
        <div style={{ ...A.card, padding:"20px 24px" }}>
          <SLabel>Precificação</SLabel>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={A.label}>Meu Preço de Venda</label><input style={A.input} type="number" value={form.myPrice} onChange={set("myPrice")} placeholder="0,00"/></div>
            <div><label style={A.label}>Moeda</label><select style={A.input} value={form.currency} onChange={set("currency")}><option value="BRL">R$ BRL</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option></select></div>
          </div>
        </div>
        <div style={{ ...A.card, padding:"20px 24px" }}>
          <SLabel>Descrição & Specs</SLabel>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div><label style={A.label}>Descrição</label><textarea style={{ ...A.input, resize:"vertical", minHeight:60 }} value={form.description} onChange={set("description")} placeholder="Diferenciais, público-alvo..."/></div>
            <div><label style={A.label}>Specs conhecidas <span style={{ color:"var(--text3)" }}>(opcional)</span></label><textarea style={{ ...A.input, resize:"vertical", minHeight:72 }} value={form.specs} onChange={set("specs")} placeholder='Ex: Tela 6.78" AMOLED 120Hz, 8GB RAM...'/></div>
          </div>
        </div>
        <div style={{ ...A.card, padding:"20px 24px", borderColor:"rgba(124,58,237,.3)" }}>
          <SLabel color="var(--accent2)">Inteligência Competitiva</SLabel>
          <label style={A.label}>Marcas concorrentes sugeridas <span style={{ color:"var(--text3)", fontWeight:400 }}>— a IA prioriza na busca</span></label>
          <input style={A.input} value={form.competitorBrands} onChange={set("competitorBrands")} placeholder="Ex: Samsung, Motorola, Xiaomi"/>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={A.btnGhost}>Cancelar</button>
          <button onClick={save} style={A.btnPrimary}>{isEdit?"💾 Salvar":"✅ Cadastrar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PRODUCT DETAIL
═══════════════════════════════════════════════ */
function ProductDetail({ product, onEdit, onNewAnalysis, onViewAnalysis }) {
  const color   = catColor(product.category);
  const history = getHistory(product.id);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeIn .25s ease" }}>
      <div style={{ ...A.card, borderTop:`3px solid ${color}`, padding:"20px 24px", display:"flex", gap:20, alignItems:"flex-start", flexWrap:"wrap" }}>
        <div style={{ width:52, height:52, borderRadius:14, background:`${color}18`, border:`1.5px solid ${color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{catIcon(product.category)}</div>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontSize:10, color, fontFamily:"'Space Mono',monospace", letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>{product.category}</div>
          <div style={{ fontSize:20, fontWeight:800, marginBottom:2 }}>{product.name}</div>
          {product.brand&&<div style={{ fontSize:12, color:"var(--text3)" }}>{product.brand}{product.model?` · ${product.model}`:""}</div>}
          {product.description&&<div style={{ fontSize:12, color:"var(--text2)", marginTop:8, lineHeight:1.6 }}>{product.description}</div>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10 }}>
          {product.myPrice&&<div style={{ textAlign:"right" }}><div style={{ fontSize:10, color:"var(--text3)", fontFamily:"'Space Mono',monospace", marginBottom:2 }}>MEU PREÇO</div><div style={{ fontSize:22, fontWeight:800, fontFamily:"'Space Mono',monospace", color }}>{fmt(product.myPrice,product.currency)}</div></div>}
          <button onClick={onEdit} style={{ ...A.btnGhost, fontSize:12, padding:"8px 14px" }}>✏️ Editar</button>
        </div>
      </div>

      {(product.specs||product.ean||product.competitorBrands)&&(
        <div style={{ ...A.card, padding:"18px 24px" }}>
          <SLabel>Dados Cadastrados</SLabel>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
            {product.ean&&<div><div style={{ fontSize:10, color:"var(--text3)", marginBottom:3 }}>EAN</div><div style={{ fontSize:12, fontFamily:"'Space Mono',monospace" }}>{product.ean}</div></div>}
            {product.competitorBrands&&<div><div style={{ fontSize:10, color:"var(--text3)", marginBottom:3 }}>Concorrentes sugeridos</div><div style={{ fontSize:12, color:"var(--accent2)" }}>{product.competitorBrands}</div></div>}
            {product.specs&&<div style={{ gridColumn:"1/-1" }}><div style={{ fontSize:10, color:"var(--text3)", marginBottom:3 }}>Specs</div><div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.6 }}>{product.specs}</div></div>}
          </div>
        </div>
      )}

      <div style={{ ...A.card, overflow:"hidden" }}>
        <div style={{ padding:"18px 24px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:history.length>0?"1px solid var(--border)":"none" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>Histórico de Análises</div>
            <div style={{ fontSize:11, color:"var(--text3)" }}>{history.length} análise{history.length!==1?"s":""} registrada{history.length!==1?"s":""}</div>
          </div>
          <button onClick={onNewAnalysis} style={{ ...A.btnPrimary, fontSize:12, padding:"9px 18px" }}>🔍 Nova Análise</button>
        </div>
        {history.length===0&&<div style={{ padding:"36px 24px", textAlign:"center", color:"var(--text3)", fontSize:13 }}>Nenhuma análise ainda.</div>}
        {history.map((entry,i)=>{
          const d=new Date(entry.cachedAt);
          const comps=entry.competitors||[];
          const stores=new Set([...(entry.my_product_stores||[]),...comps.flatMap(c=>c.prices_by_store||[])].map(p=>p.store));
          return (
            <button key={entry.histId||i} onClick={()=>onViewAnalysis(entry)}
              style={{ width:"100%", background:"none", border:"none", borderBottom:i<history.length-1?"1px solid var(--border)":"none", cursor:"pointer", padding:"14px 24px", display:"flex", alignItems:"center", gap:16, textAlign:"left" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <div style={{ flexShrink:0, textAlign:"center", background:"var(--bg3)", borderRadius:8, padding:"8px 12px", minWidth:56 }}>
                <div style={{ fontSize:16, fontWeight:800, fontFamily:"'Space Mono',monospace", color:"var(--accent)", lineHeight:1 }}>{d.getDate().toString().padStart(2,"0")}</div>
                <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"'Space Mono',monospace", marginTop:2 }}>{d.toLocaleDateString("pt-BR",{month:"short"}).toUpperCase()}</div>
                <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"'Space Mono',monospace" }}>{d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:5 }}>
                  {entry.market_avg_price>0&&<div style={{ fontSize:12 }}><span style={{ color:"var(--text3)" }}>Média: </span><span style={{ fontWeight:700, fontFamily:"'Space Mono',monospace", color:"var(--warn)" }}>{fmt(entry.market_avg_price,product.currency)}</span></div>}
                  {entry.market_min_price>0&&<div style={{ fontSize:12 }}><span style={{ color:"var(--text3)" }}>Mín: </span><span style={{ fontWeight:700, fontFamily:"'Space Mono',monospace", color:"var(--accent3)" }}>{fmt(entry.market_min_price,product.currency)}</span></div>}
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {comps.length>0&&<span style={{ fontSize:10, color:"var(--text3)", background:"var(--bg3)", borderRadius:4, padding:"2px 7px" }}>{comps.length} concorrente{comps.length!==1?"s":""}</span>}
                  {stores.size>0&&<span style={{ fontSize:10, color:"var(--text3)", background:"var(--bg3)", borderRadius:4, padding:"2px 7px" }}>{stores.size} loja{stores.size!==1?"s":""}</span>}
                  {entry.price_position_label&&<span style={{ fontSize:10, color:"var(--accent)", background:"rgba(0,212,255,0.08)", borderRadius:4, padding:"2px 7px" }}>📍 {entry.price_position_label}</span>}
                  {entry.usedModel&&<span style={{ fontSize:10, color:"var(--accent2)", background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.2)", borderRadius:4, padding:"2px 7px", fontFamily:"'Space Mono',monospace" }}>⚡ {entry.usedModel}</span>}
                </div>
              </div>
              <div style={{ fontSize:18, color:"var(--text3)" }}>›</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ANALYSIS TABS
═══════════════════════════════════════════════ */
const ANALYSIS_TABS = [
  { id:"posicionamento", icon:"📊", label:"Posicionamento" },
  { id:"precos",         icon:"🏪", label:"Preços por Loja" },
  { id:"specs",          icon:"🔬", label:"Specs Técnicas" },
  { id:"insights",       icon:"💡", label:"Insights" },
];

function AnalysisTabs({ tab, setTab }) {
  return (
    <div style={{ ...A.card, marginBottom:16, display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
      {ANALYSIS_TABS.map((t,i)=>(
        <button key={t.id} onClick={()=>setTab(t.id)}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"12px 8px", color:tab===t.id?"var(--accent)":"var(--text2)", borderBottom:tab===t.id?"2px solid var(--accent)":"2px solid transparent", borderRight:i<3?"1px solid var(--border)":"none", fontFamily:"'Syne',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:18, lineHeight:1 }}>{t.icon}</span>
          <span style={{ fontSize:11, fontWeight:700, textAlign:"center", lineHeight:1.3 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function AnalysisContent({ tab, product, market, mySpecs }) {
  const comps = market?.competitors||[];

  if (tab==="posicionamento") return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, animation:"fadeIn .3s ease" }}>
      <div>
        <SLabel color="var(--accent)">Espectro de Preços</SLabel>
        <Spectrum myPrice={product.myPrice} myStorePrices={market.my_product_stores} competitors={comps} currency={product.currency}/>
        {market.price_position_label&&<div style={{ marginTop:18, padding:"12px 16px", background:"rgba(0,212,255,0.05)", border:"1px solid rgba(0,212,255,0.15)", borderRadius:8, fontSize:13, color:"var(--text2)", lineHeight:1.6 }}>📍 <strong style={{ color:"var(--accent)" }}>Posicionamento: </strong>{market.price_position_label}</div>}
      </div>
      <div>
        <SLabel>Concorrentes</SLabel>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10 }}>
          {comps.map((c,i)=>(
            <div key={i} style={{ background:"var(--bg3)", border:`1px solid var(--border2)`, borderLeft:`3px solid ${COMP_COLORS[i%COMP_COLORS.length]}`, borderRadius:10, padding:"14px 16px" }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{c.name}</div>
              <div style={{ fontSize:11, color:"var(--text3)", marginBottom:10 }}>{c.brand}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, fontWeight:700, color:"var(--warn)", marginBottom:4 }}>{fmt(c.min_price,product.currency)} – {fmt(c.max_price,product.currency)}</div>
              <div style={{ fontSize:11, color:"var(--text3)" }}>Média: {fmt(c.avg_price,product.currency)}</div>
              {c.vs_my_product&&<div style={{ fontSize:11, color:"var(--text2)", lineHeight:1.5, borderTop:"1px solid var(--border)", paddingTop:8, marginTop:8 }}>{c.vs_my_product}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (tab==="precos") return (
    <div style={{ animation:"fadeIn .3s ease" }}>
      <SLabel>Produtos × Lojas</SLabel>
      <StoreTable myProduct={product} myStorePrices={market.my_product_stores} competitors={comps} currency={product.currency}/>
    </div>
  );

  if (tab==="specs") return (
    <div style={{ animation:"fadeIn .3s ease" }}>
      <SLabel color="var(--accent2)">Especificações Técnicas</SLabel>
      <SpecTable myName={mySpecs?.product_name||product.name} mySpecs={mySpecs?.specs||{}} competitors={comps}/>
      {market.spec_gaps&&<div style={{ marginTop:18, padding:"14px 18px", background:"rgba(124,58,237,0.07)", border:"1px solid rgba(124,58,237,0.2)", borderRadius:10, fontSize:13, lineHeight:1.75 }}><div style={{ color:"#a78bfa", fontWeight:700, fontSize:10, letterSpacing:1.2, textTransform:"uppercase", marginBottom:8 }}>Lacunas Técnicas</div>{market.spec_gaps}</div>}
    </div>
  );

  if (tab==="insights") return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeIn .3s ease" }}>
      <SLabel>Insights de Mercado</SLabel>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:10 }}>
        {(market.insights||[]).map((ins,i)=>(
          <div key={i} style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:11, padding:"16px 18px", display:"flex", gap:12 }}>
            <div style={{ fontSize:22, flexShrink:0 }}>{ins.icon}</div>
            <div><div style={{ fontWeight:700, fontSize:13, marginBottom:5 }}>{ins.title}</div><div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.6 }}>{ins.description}</div></div>
          </div>
        ))}
      </div>
      {market.recommendation&&<div style={{ padding:"18px 22px", background:"rgba(124,58,237,0.07)", border:"1px solid rgba(124,58,237,0.22)", borderRadius:12, fontSize:13, lineHeight:1.8 }}><div style={{ color:"#a78bfa", fontWeight:700, fontSize:10, letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 }}>Recomendação Estratégica</div>{market.recommendation}</div>}
    </div>
  );

  return null;
}

/* ═══════════════════════════════════════════════
   RIGHT PANEL
═══════════════════════════════════════════════ */
function RightPanel({ analyzing, market, mySpecs, prov, auth }) {
  const color = catColor(analyzing.category);
  const comps = market?.competitors||[];
  const lojas = new Set([...(market.my_product_stores||[]),...comps.flatMap(c=>c.prices_by_store||[])].map(p=>p.store)).size;
  return (
    <aside style={{ width:248, flexShrink:0, background:"var(--rpanel)", borderLeft:"1px solid var(--border)", display:"flex", flexDirection:"column", overflowY:"auto" }}>
      <div style={{ padding:"20px 18px", borderBottom:"1px solid var(--border)", textAlign:"center" }}>
        <div style={{ fontSize:9, color, fontFamily:"'Space Mono',monospace", letterSpacing:2.5, textTransform:"uppercase", marginBottom:8 }}>MEU PREÇO</div>
        <div style={{ fontSize:30, fontWeight:800, fontFamily:"'Space Mono',monospace", color, lineHeight:1.1, marginBottom:5 }}>{analyzing.myPrice?fmt(analyzing.myPrice,analyzing.currency):"—"}</div>
        <div style={{ fontSize:10, color:"var(--text3)", fontFamily:"'Space Mono',monospace", lineHeight:1.5 }}>{market.product_name||analyzing.name}</div>
      </div>
      <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"'Space Mono',monospace", letterSpacing:2, textTransform:"uppercase" }}>MERCADO</div>
        {[
          {label:"Mínimo",value:fmt(market.market_min_price,analyzing.currency),c:"var(--accent3)"},
          {label:"Média", value:fmt(market.market_avg_price,analyzing.currency), c:"var(--text2)"},
          {label:"Máximo",value:fmt(market.market_max_price,analyzing.currency),c:"var(--danger)"},
        ].map(s=>(
          <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:11, color:"var(--text3)", fontFamily:"'Space Mono',monospace" }}>{s.label}</div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Space Mono',monospace", color:s.c }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[{label:"Concorrentes",value:comps.length,c:"var(--accent)"},{label:"Lojas",value:lojas,c:"var(--accent3)"}].map(s=>(
          <div key={s.label} style={{ background:"var(--bg3)", borderRadius:8, padding:"10px", textAlign:"center" }}>
            <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"'Space Mono',monospace", letterSpacing:.5, marginBottom:3, textTransform:"uppercase" }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Space Mono',monospace", color:s.c }}>{s.value}</div>
          </div>
        ))}
      </div>
      {market.price_position_label&&(
        <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"'Space Mono',monospace", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>POSICIONAMENTO</div>
          <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.6 }}>📍 {market.price_position_label}</div>
        </div>
      )}
      {mySpecs?.specs&&Object.keys(mySpecs.specs).length>0&&(
        <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"'Space Mono',monospace", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>SPECS</div>
          <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Space Mono',monospace", color:"var(--accent2)" }}>{Object.keys(mySpecs.specs).length}</div>
          <div style={{ fontSize:10, color:"var(--text3)", fontFamily:"'Space Mono',monospace" }}>especificações</div>
        </div>
      )}
      <div style={{ padding:"14px 18px", marginTop:"auto" }}>
        <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"'Space Mono',monospace", letterSpacing:1.5, marginBottom:5 }}>MODELO</div>
        <div style={{ fontSize:10, color:prov.color, fontFamily:"'Space Mono',monospace" }}>{auth.model||prov.name}</div>
        <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"'Space Mono',monospace", marginTop:2 }}>{prov.badge}</div>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════
   PDF
═══════════════════════════════════════════════ */
function generatePDF(analyzing, market, mySpecs, prov, auth, currentAnalysis) {
  const comps = market?.competitors||[];
  const date  = new Date().toLocaleDateString("pt-BR");
  const storeSet=new Set(); (market?.my_product_stores||[]).forEach(p=>storeSet.add(p.store)); comps.forEach(c=>(c.prices_by_store||[]).forEach(p=>storeSet.add(p.store)));
  const stores = Array.from(storeSet);
  const allSK  = new Set(Object.keys(mySpecs?.specs||{})); comps.forEach(c=>{ if(c.specs) Object.keys(c.specs).forEach(k=>allSK.add(k)); });
  const modelLabel = currentAnalysis?.usedModel||auth.model||prov.name;
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>PriceRadar — ${analyzing.name}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;color:#1a2332;background:#fff;padding:32px 40px;font-size:13px}h1{font-size:22px;font-weight:800}h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#00b4d8;margin:24px 0 10px;padding-bottom:5px;border-bottom:2px solid #00b4d8}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:18px;border-bottom:3px solid #070e1a}.badge{display:inline-block;background:#070e1a;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:4px;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}.price-big{font-size:26px;font-weight:800;color:#00b4d8}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px}.stat{background:#f4f7fb;border-radius:8px;padding:12px 14px}.stat-label{font-size:10px;color:#7a9bb5;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}.stat-val{font-size:16px;font-weight:800;color:#1a2332}table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:6px}th{background:#f4f7fb;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#7a9bb5;font-weight:700;white-space:nowrap}td{padding:8px 10px;border-bottom:1px solid #eef0f3;vertical-align:middle}.mine td{background:#f0fbff;font-weight:700}.mine td:first-child{color:#00b4d8}.insight{display:flex;gap:10px;padding:10px 14px;background:#f4f7fb;border-radius:8px;margin-bottom:6px}.insight-icon{font-size:18px;flex-shrink:0}.insight-title{font-weight:700;font-size:12px;margin-bottom:2px}.insight-desc{font-size:11px;color:#4a6070;line-height:1.5}.rec{background:#070e1a;color:#fff;border-radius:8px;padding:16px 18px;margin-top:6px;line-height:1.7}.rec-label{font-size:10px;color:#00b4d8;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:6px}.footer{margin-top:28px;padding-top:12px;border-top:1px solid #eef0f3;font-size:10px;color:#7a9bb5;display:flex;justify-content:space-between}@media print{body{padding:16px 20px}}</style></head><body>
<div class="header"><div><div class="badge">${analyzing.category}</div><h1>${market?.product_name||analyzing.name}</h1><div style="font-size:11px;color:#7a9bb5;margin:4px 0">${market?.brand||analyzing.brand||""} ${market?.model||analyzing.model||""} · ${market?.category_label||""}</div>${market?.official_description?`<div style="max-width:480px;color:#4a6070;line-height:1.5;font-size:12px">${market.official_description}</div>`:""}</div><div style="text-align:right">${analyzing.myPrice?`<div style="font-size:10px;color:#7a9bb5;margin-bottom:3px">MEU PREÇO</div><div class="price-big">${fmt(analyzing.myPrice,analyzing.currency)}</div>`:""}<div style="font-size:10px;color:#7a9bb5;margin-top:6px">Gerado em ${date} · PriceRadar · ${prov.badge} · ${modelLabel}</div></div></div>
<div class="stats"><div class="stat"><div class="stat-label">Faixa do Mercado</div><div class="stat-val" style="font-size:12px">${fmt(market?.market_min_price,analyzing.currency)} – ${fmt(market?.market_max_price,analyzing.currency)}</div></div><div class="stat"><div class="stat-label">Média</div><div class="stat-val">${fmt(market?.market_avg_price,analyzing.currency)}</div></div><div class="stat"><div class="stat-label">Concorrentes</div><div class="stat-val">${comps.length}</div></div><div class="stat"><div class="stat-label">Lojas</div><div class="stat-val">${stores.length}</div></div></div>
${market?.price_position_label?`<div style="background:#e0f7fa;border-left:4px solid #00b4d8;padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:18px;color:#00616e;font-weight:600;font-size:12px">📍 ${market.price_position_label}</div>`:""}
<h2>Posicionamento de Preços</h2><table><thead><tr><th>Produto</th><th>Mín</th><th>Média</th><th>Máx</th>${stores.map(s=>`<th>${s}</th>`).join("")}</tr></thead><tbody>
<tr class="mine"><td>⭐ ${market?.product_name||analyzing.name}</td><td>${fmt(Math.min(...(market?.my_product_stores||[]).map(p=>p.price).filter(Boolean)),analyzing.currency)}</td><td>${fmt(Math.round((market?.my_product_stores||[]).map(p=>p.price).filter(Boolean).reduce((a,b,_,arr)=>a+b/arr.length,0)||0),analyzing.currency)}</td><td>${fmt(Math.max(...(market?.my_product_stores||[]).map(p=>p.price).filter(Boolean)),analyzing.currency)}</td>${stores.map(s=>{const e=(market?.my_product_stores||[]).find(p=>p.store===s);return`<td>${e?fmt(e.price,analyzing.currency):"—"}</td>`;}).join("")}</tr>
${comps.map(c=>`<tr><td><strong>${c.name}</strong> <span style="color:#7a9bb5;font-size:10px">${c.brand||""}</span></td><td>${fmt(c.min_price,analyzing.currency)}</td><td>${fmt(c.avg_price,analyzing.currency)}</td><td>${fmt(c.max_price,analyzing.currency)}</td>${stores.map(s=>{const e=(c.prices_by_store||[]).find(p=>p.store===s);return`<td>${e?fmt(e.price,analyzing.currency):"—"}</td>`;}).join("")}</tr>`).join("")}
</tbody></table>
${allSK.size>0?`<h2>Especificações Técnicas</h2><table><thead><tr><th>Especificação</th><th>⭐ ${market?.product_name||analyzing.name}</th>${comps.filter(c=>c.specs&&Object.keys(c.specs).length).map(c=>`<th>${c.name}</th>`).join("")}</tr></thead><tbody>${Array.from(allSK).map(key=>{const mv=(mySpecs?.specs||{})[key];const cols=comps.filter(c=>c.specs&&Object.keys(c.specs).length);return`<tr><td style="color:#7a9bb5;font-size:10px">${key}</td><td style="font-weight:600">${mv||"—"}</td>${cols.map(c=>{const cv=c.specs?.[key];const n=v=>parseFloat(String(v||"").replace(/[^\d.]/g,""));const a=n(mv),b=n(cv);const cls=mv&&cv&&!isNaN(a)&&!isNaN(b)?(a>b?'style="color:#065f46;font-weight:600"':a<b?'style="color:#991b1b;font-weight:600"':""):"";return`<td ${cls}>${cv||"—"}</td>`;}).join("")}</tr>`;}).join("")}</tbody></table>`:""}
${(market?.insights||[]).length>0?`<h2>Insights</h2>${market.insights.map(ins=>`<div class="insight"><div class="insight-icon">${ins.icon||"💡"}</div><div><div class="insight-title">${ins.title}</div><div class="insight-desc">${ins.description}</div></div></div>`).join("")}`:""}
${market?.spec_gaps?`<div style="background:#f4f7fb;border-radius:8px;padding:14px 16px;margin-top:14px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7a9bb5;margin-bottom:6px">Lacunas Técnicas</div><div style="line-height:1.7;color:#4a6070;font-size:12px">${market.spec_gaps}</div></div>`:""}
${market?.recommendation?`<h2>Recomendação Estratégica</h2><div class="rec"><div class="rec-label">Recomendação</div>${market.recommendation}</div>`:""}
<div class="footer"><span>PriceRadar · ${prov.badge} · ${modelLabel}</span><span>${date}</span></div>
<script>window.onload=()=>window.print();</script></body></html>`;
  const w=window.open("","_blank"); w.document.write(html); w.document.close();
}

/* ═══════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════ */
export default function App() {
  const [auth,    setAuth]    = useState(()=>{ try{return JSON.parse(sessionStorage.getItem("pr_auth"))||null;}catch{return null;} });
  const [products,setProducts] = useLocalStorage("priceradar_products", []);
  const [screen,  setScreen]  = useState("catalog");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [analyzing,setAnalyzing] = useState(null);
  const [currentAnalysis,setCurrentAnalysis] = useState(null);
  const [analysisTab,setAnalysisTab] = useState("posicionamento");
  const [phase,   setPhase]   = useState("idle");
  const [market,  setMarket]  = useState(null);
  const [mySpecs, setMySpecs] = useState(null);
  const [logs,    setLogs]    = useState([]);
  const [error,   setError]   = useState("");
  const [search,  setSearch]  = useState("");
  const logRef = useRef(null);

  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; },[logs]);

  const saveAuth = (provider,key,model) => { const a={provider,key,model}; sessionStorage.setItem("pr_auth",JSON.stringify(a)); setAuth(a); };
  const logout   = () => { sessionStorage.removeItem("pr_auth"); setAuth(null); };

  if (!auth) return <><style>{STYLE}</style><LoginScreen onSave={saveAuth}/></>;

  const prov = PROVIDERS[auth.provider];

  const handleNew     = ()    => { setEditing(null); setScreen("form"); };
  const handleEdit    = p     => { setEditing(p); setScreen("form"); };
  const handleDelete  = id    => { clearHistory(id); setProducts(ps=>ps.filter(p=>p.id!==id)); if(viewing?.id===id||analyzing?.id===id){ setScreen("catalog"); setViewing(null); setAnalyzing(null); } };
  const handleSave    = p     => { setProducts(ps=>editing?ps.map(x=>x.id===p.id?p:x):[...ps,p]); if(editing&&viewing?.id===p.id)setViewing(p); setScreen(editing&&viewing?"product":"catalog"); setEditing(null); };
  const handleView    = p     => { setViewing(p); setScreen("product"); };
  const handleNewAn   = p     => { setAnalyzing(p); setScreen("analysis"); setAnalysisTab("posicionamento"); setMarket(null); setMySpecs(null); setPhase("idle"); setLogs([]); setError(""); setCurrentAnalysis(null); };
  const handleViewAn  = (p,e) => { setAnalyzing(p); setCurrentAnalysis(e); setScreen("analysis"); setAnalysisTab("posicionamento"); setMarket(e); setMySpecs(e); setPhase("done"); setLogs([]); };

  const addLog = (msg,type="") => { const ts=new Date().toLocaleTimeString("pt-BR"); setLogs(prev=>[...prev,{ts,msg,type}]); };

  const doAnalysis = async () => {
    setPhase("loading"); setLogs([]); setError("");
    try {
      const result = await runAnalysis(auth.provider, auth.key, auth.model||"gpt-4o-mini", analyzing, addLog);
      setMySpecs(result); setMarket(result); setCurrentAnalysis(result);
      saveToHistory(analyzing.id, {...result, usedProvider:auth.provider, usedModel:auth.model||"gpt-4o-mini"});
      addLog("✅ Análise concluída!", "ok"); setPhase("done");
    } catch(e) { setError(e.message); addLog(`✗ ${e.message}`); setPhase("error"); }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand||"").toLowerCase().includes(search.toLowerCase()) ||
    (p.category||"").toLowerCase().includes(search.toLowerCase())
  );

  const analysisDate = currentAnalysis?.cachedAt ? new Date(currentAnalysis.cachedAt).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}) : "Nova Análise";

  return (
    <>
      <style>{STYLE}</style>
      <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>

        {/* ── SIDEBAR ─────────────────────────── */}
        <aside style={{ width:240, flexShrink:0, background:"var(--sidebar)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"16px 18px", borderBottom:"1px solid var(--border)" }}>
            <button onClick={()=>{ setScreen("catalog"); setAnalyzing(null); }} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:10, padding:0, width:"100%" }}>
              <div style={{ width:30, height:30, background:"linear-gradient(135deg,var(--accent),var(--accent2))", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>📡</div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:"var(--text)" }}>Price<span style={{ color:"var(--accent)" }}>Radar</span></div>
                <div style={{ fontSize:8, color:"var(--text3)", fontFamily:"'Space Mono',monospace", letterSpacing:1 }}>INTELIGÊNCIA DE PREÇOS</div>
              </div>
            </button>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"10px 0" }}>
            <div style={{ padding:"0 14px 5px", fontSize:9, color:"var(--text3)", fontFamily:"'Space Mono',monospace", letterSpacing:2, fontWeight:700 }}>PRODUTOS</div>
            {screen!=="form" && (
              <div style={{ padding:"0 10px 8px" }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{ ...A.input, fontSize:11, padding:"6px 10px", borderRadius:6 }}/>
              </div>
            )}
            {filtered.length===0&&products.length===0&&<div style={{ padding:"8px 16px", fontSize:12, color:"var(--text3)" }}>Nenhum produto.</div>}
            {filtered.map(p=>{
              const isSel = (viewing?.id===p.id&&screen==="product")||(analyzing?.id===p.id&&screen==="analysis");
              const hc    = getHistory(p.id).length;
              return (
                <button key={p.id} onClick={()=>handleView(p)}
                  style={{ width:"100%", background:isSel?"rgba(0,212,255,0.06)":"none", border:"none", borderLeft:`3px solid ${isSel?catColor(p.category):"transparent"}`, cursor:"pointer", padding:"8px 14px 8px 11px", display:"flex", alignItems:"center", gap:8, textAlign:"left" }}>
                  <div style={{ fontSize:14, flexShrink:0 }}>{catIcon(p.category)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:isSel?700:500, color:isSel?"var(--text)":"var(--text2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                    <div style={{ fontSize:10, color:"var(--text3)", marginTop:1, fontFamily:"'Space Mono',monospace", display:"flex", gap:5 }}>
                      <span>{p.myPrice?fmt(p.myPrice,p.currency):"—"}</span>
                      {hc>0&&<span style={{ color:"var(--accent3)" }}>· {hc} análise{hc!==1?"s":""}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ borderTop:"1px solid var(--border)", padding:10, display:"flex", flexDirection:"column", gap:8 }}>
            <button onClick={handleNew} style={{ ...A.btnPrimary, width:"100%", justifyContent:"center", fontSize:12, padding:"9px 14px" }}>＋ Novo Produto</button>
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 4px 0" }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:prov.color }}/>
              <div style={{ flex:1, minWidth:0, fontSize:10, color:"var(--text2)", fontFamily:"'Space Mono',monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{auth.model||prov.name}</div>
              <button onClick={logout} style={{ background:"none", border:"1px solid var(--border2)", color:"var(--text3)", cursor:"pointer", padding:"2px 7px", borderRadius:4, fontSize:10, fontFamily:"'Space Mono',monospace" }}>sair</button>
            </div>
          </div>
        </aside>

        {/* ── MAIN ────────────────────────────── */}
        <main style={{ flex:1, overflowY:"auto", background:"var(--bg2)", display:"flex", flexDirection:"column", minWidth:0 }}>

          {/* TOPBAR */}
          <header style={{ padding:"0 20px", height:52, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8, background:"var(--bg)", flexShrink:0, position:"sticky", top:0, zIndex:50 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:0, overflow:"hidden" }}>
              <button onClick={()=>setScreen("catalog")} style={{ background:"none", border:"none", color:"var(--text3)", cursor:"pointer", fontSize:12, padding:0, flexShrink:0 }}>Catálogo</button>
              {(screen==="product"||screen==="analysis")&&viewing&&<>
                <span style={{ color:"var(--text3)", flexShrink:0 }}>›</span>
                <button onClick={()=>setScreen("product")} style={{ background:"none", border:"none", color:screen==="product"?"var(--text)":"var(--text3)", cursor:"pointer", fontSize:12, padding:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:160 }}>{viewing.name}</button>
              </>}
              {screen==="analysis"&&<>
                <span style={{ color:"var(--text3)", flexShrink:0 }}>›</span>
                <span style={{ fontSize:11, color:"var(--text2)", whiteSpace:"nowrap" }}>{analysisDate}</span>
              </>}
              {screen==="form"&&<><span style={{ color:"var(--text3)", flexShrink:0 }}>›</span><span style={{ fontSize:12, color:"var(--text2)" }}>{editing?"Editar":"Novo Produto"}</span></>}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <div style={{ fontSize:10, color:prov.color, fontFamily:"'Space Mono',monospace", background:`${prov.color}12`, border:`1px solid ${prov.color}30`, borderRadius:5, padding:"4px 9px", whiteSpace:"nowrap" }}>⚡ {auth.model||prov.name}</div>
              {screen==="analysis"&&phase==="done"&&<>
                <button onClick={doAnalysis}  style={{ ...A.btnGhost, fontSize:11, padding:"6px 11px" }}>🔄 Recalcular</button>
                <button onClick={()=>generatePDF(analyzing,market,mySpecs,prov,auth,currentAnalysis)} style={{ ...A.btnPrimary, fontSize:11, padding:"7px 13px", background:"linear-gradient(135deg,#10b981,#059669)" }}>⬇️ PDF</button>
              </>}
              {screen==="analysis"&&phase==="idle"&&  <button onClick={doAnalysis} style={{ ...A.btnPrimary, fontSize:12, padding:"8px 14px" }}>🔍 Iniciar Análise</button>}
              {screen==="analysis"&&phase==="error"&& <button onClick={doAnalysis} style={{ ...A.btnPrimary, fontSize:12, padding:"8px 14px", background:"linear-gradient(135deg,var(--danger),#b91c1c)" }}>🔄 Tentar novamente</button>}
            </div>
          </header>

          {/* PAGE */}
          <div style={{ flex:1, padding:"24px 28px" }}>

            {screen==="catalog"&&(
              <div style={{ animation:"fadeIn .3s ease" }}>
                {products.length===0&&(
                  <div style={{ ...A.card, padding:"56px 32px", textAlign:"center" }}>
                    <div style={{ fontSize:48, opacity:.1, marginBottom:16 }}>📦</div>
                    <div style={{ fontSize:17, fontWeight:700, color:"var(--text2)", marginBottom:8 }}>Nenhum produto cadastrado</div>
                    <div style={{ fontSize:13, color:"var(--text3)", maxWidth:300, margin:"0 auto 22px", lineHeight:1.8 }}>Cadastre seus produtos para analisar o mercado.</div>
                    <button onClick={handleNew} style={{ ...A.btnPrimary, margin:"0 auto" }}>＋ Cadastrar primeiro produto</button>
                  </div>
                )}
                {filtered.length===0&&products.length>0&&<div style={{ textAlign:"center", padding:"40px 0", color:"var(--text3)" }}>Nenhum resultado para "{search}"</div>}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:12 }}>
                  {filtered.map(p=>{
                    const c=catColor(p.category), hc=getHistory(p.id).length;
                    return (
                      <div key={p.id} style={{ ...A.card, overflow:"hidden", display:"flex", flexDirection:"column", cursor:"pointer" }} onClick={()=>handleView(p)}>
                        <div style={{ height:3, background:`linear-gradient(90deg,${c},${c}44)` }}/>
                        <div style={{ padding:"16px 18px", flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                            <span style={{ fontSize:20 }}>{catIcon(p.category)}</span>
                            <div style={{ fontSize:9, letterSpacing:.8, textTransform:"uppercase", fontFamily:"'Space Mono',monospace", color:c, background:`${c}15`, border:`1px solid ${c}30`, padding:"3px 8px", borderRadius:4 }}>{p.category}</div>
                            {hc>0&&<div style={{ fontSize:9, color:"var(--accent3)", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", padding:"3px 8px", borderRadius:4, fontFamily:"'Space Mono',monospace", marginLeft:"auto" }}>📊 {hc}</div>}
                          </div>
                          <div style={{ fontSize:14, fontWeight:800, marginBottom:2, lineHeight:1.3 }}>{p.name}</div>
                          {p.brand&&<div style={{ fontSize:11, color:"var(--text3)", marginBottom:8 }}>{p.brand}{p.model?` · ${p.model}`:""}</div>}
                          {p.myPrice&&<div style={{ fontFamily:"'Space Mono',monospace", fontSize:16, fontWeight:700, color:c, marginBottom:6 }}>{fmt(p.myPrice,p.currency)}</div>}
                          {p.description&&<div style={{ fontSize:11, color:"var(--text2)", lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{p.description}</div>}
                        </div>
                        <div style={{ display:"flex", borderTop:"1px solid var(--border)" }} onClick={e=>e.stopPropagation()}>
                          <CardBtn label="✏️ Editar"    onClick={()=>handleEdit(p)}   hov="rgba(255,255,255,0.03)" clr={null}            notLast/>
                          <CardBtn label="🗑 Remover"   onClick={()=>{ if(confirm(`Remover "${p.name}"?`))handleDelete(p.id); }} hov="rgba(244,63,94,0.07)" clr="var(--danger)" notLast/>
                          <CardBtn label="📋 Detalhes" onClick={()=>handleView(p)}   hov={`${c}12`}              clr={c}     bold/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {screen==="product"&&viewing&&(
              <ProductDetail product={viewing} onEdit={()=>handleEdit(viewing)} onNewAnalysis={()=>handleNewAn(viewing)} onViewAnalysis={e=>handleViewAn(viewing,e)}/>
            )}

            {screen==="form"&&(
              <ProductForm initial={editing} onSave={handleSave} onCancel={()=>setScreen(viewing?"product":"catalog")}/>
            )}

            {screen==="analysis"&&analyzing&&(
              <div style={{ animation:"fadeIn .3s ease" }}>
                {phase==="idle"&&(
                  <div style={{ ...A.card, padding:"56px 32px", textAlign:"center", maxWidth:520, margin:"0 auto" }}>
                    <div style={{ fontSize:44, opacity:.13, marginBottom:16 }}>{catIcon(analyzing.category)}</div>
                    <div style={{ fontSize:16, fontWeight:700, color:"var(--text2)", marginBottom:8 }}>Pronto para analisar o mercado</div>
                    <div style={{ fontSize:13, color:"var(--text3)", maxWidth:360, margin:"0 auto 22px", lineHeight:1.8 }}>
                      {auth.provider==="claude"
                        ? <>O Claude vai identificar specs e concorrentes. <span style={{ color:"var(--warn)" }}>⚠️ Preços aproximados.</span></>
                        : <>O {prov.name} vai buscar specs, concorrentes e <strong style={{ color:"var(--accent3)" }}>preços reais</strong> via web search.</>}
                    </div>
                    <button onClick={doAnalysis} style={{ ...A.btnPrimary, margin:"0 auto" }}>🔍 Iniciar Análise</button>
                  </div>
                )}
                {phase==="loading"&&(
                  <div style={{ ...A.card, padding:"52px 32px", display:"flex", flexDirection:"column", alignItems:"center", gap:18, maxWidth:520, margin:"0 auto" }}>
                    <div style={{ width:52, height:52, border:"2px solid rgba(0,212,255,.1)", borderTop:"2px solid var(--accent)", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, color:"var(--accent)", animation:"pulse 2s infinite" }}>Pesquisando mercado...</div>
                    <div ref={logRef} style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:10, padding:"12px 16px", maxHeight:200, overflowY:"auto", fontFamily:"'Space Mono',monospace", fontSize:11, lineHeight:1.9, width:"100%" }}>
                      {logs.map((l,i)=>(
                        <div key={i} style={{ display:"flex", gap:8 }}>
                          <span style={{ color:"var(--text3)", flexShrink:0 }}>[{l.ts}]</span>
                          <span style={{ color:l.type==="ok"?"var(--accent3)":l.type==="search"?"var(--accent)":"var(--text2)" }}>{l.msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {phase==="error"&&(
                  <div style={{ ...A.card, padding:"36px 32px", textAlign:"center", maxWidth:480, margin:"0 auto" }}>
                    <div style={{ fontSize:32, marginBottom:12 }}>❌</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"var(--danger)", marginBottom:8 }}>Erro na análise</div>
                    <div style={{ fontSize:12, color:"var(--text2)", marginBottom:20, lineHeight:1.7 }}>{error}</div>
                    <button onClick={doAnalysis} style={{ ...A.btnPrimary, margin:"0 auto" }}>Tentar novamente</button>
                  </div>
                )}
                {phase==="done"&&market&&(
                  <div style={{ animation:"fadeUp .3s ease" }}>
                    <AnalysisTabs tab={analysisTab} setTab={setAnalysisTab}/>
                    <AnalysisContent tab={analysisTab} product={analyzing} market={market} mySpecs={mySpecs}/>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* ── RIGHT PANEL ─────────────────────── */}
        {screen==="analysis"&&analyzing&&phase==="done"&&market&&(
          <RightPanel analyzing={analyzing} market={market} mySpecs={mySpecs} prov={prov} auth={auth}/>
        )}

      </div>
    </>
  );
}
