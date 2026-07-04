import React, { useState, useRef, useMemo } from "react";

// ── Through Buffett's Eyes ──────────────────────────────────────────────
// A value-investing lens that pulls live fundamentals from the user's
// Robinhood connection, then evaluates any US-listed ticker against the
// framework distilled from Warren Buffett's Berkshire shareholder letters.

const ROBINHOOD_MCP = {
  type: "url",
  url: "https://agent.robinhood.com/mcp/trading",
  name: "Robinhood",
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

:root{
  --paper:#EEF0E7;
  --paper-line:#DDE1D2;
  --ink:#1B2B31;
  --ink-soft:#4A5A5C;
  --moat:#2C6A5B;
  --brick:#9E3F2C;
  --brass:#9C7A33;
  --rule:#C7CDBB;
}
*{box-sizing:border-box}
.bl-root{
  background:
    repeating-linear-gradient(to bottom, transparent 0 30px, rgba(44,106,91,.05) 30px 31px),
    var(--paper);
  color:var(--ink);
  font-family:'Newsreader',Georgia,serif;
  min-height:100%;
  padding:clamp(18px,4vw,52px);
}
.bl-wrap{max-width:760px;margin:0 auto}

/* Masthead */
.bl-masthead{border-bottom:2px solid var(--ink);padding-bottom:14px;margin-bottom:6px}
.bl-eyebrow{
  font-family:'IBM Plex Sans',sans-serif;font-size:11px;letter-spacing:.34em;
  text-transform:uppercase;color:var(--ink-soft);font-weight:600;
}
.bl-title{
  font-family:'Newsreader',serif;font-weight:600;font-size:clamp(30px,6vw,50px);
  line-height:1.02;letter-spacing:-.01em;margin:6px 0 4px;
}
.bl-title em{font-style:italic;color:var(--moat)}
.bl-sub{
  font-family:'Newsreader',serif;font-style:italic;font-size:clamp(14px,2.4vw,17px);
  color:var(--ink-soft);max-width:52ch;
}
.bl-thinrule{height:1px;background:var(--rule);margin:14px 0 2px}

/* Console */
.bl-console{display:flex;gap:10px;align-items:stretch;margin:22px 0 8px;flex-wrap:wrap}
.bl-input{
  flex:1;min-width:180px;background:transparent;border:none;border-bottom:2px solid var(--ink);
  font-family:'IBM Plex Mono',monospace;font-size:clamp(20px,4vw,26px);font-weight:500;
  letter-spacing:.14em;color:var(--ink);text-transform:uppercase;padding:8px 2px;outline:none;
}
.bl-input::placeholder{color:#A9B0A0;letter-spacing:.1em}
.bl-input:focus-visible{border-bottom-color:var(--moat)}
.bl-btn{
  font-family:'IBM Plex Sans',sans-serif;font-weight:600;font-size:13px;letter-spacing:.14em;
  text-transform:uppercase;background:var(--ink);color:var(--paper);border:none;
  padding:0 22px;cursor:pointer;transition:background .15s ease;white-space:nowrap;
}
.bl-btn:hover:not(:disabled){background:var(--moat)}
.bl-btn:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.bl-btn:disabled{opacity:.45;cursor:progress}
.bl-hint{font-family:'IBM Plex Sans',sans-serif;font-size:11px;color:var(--ink-soft);letter-spacing:.02em}

/* Status */
.bl-status{
  font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--moat);
  margin-top:18px;display:flex;align-items:center;gap:9px;
}
.bl-dot{width:7px;height:7px;border-radius:50%;background:var(--moat);animation:bl-pulse 1.1s ease-in-out infinite}
@keyframes bl-pulse{0%,100%{opacity:.25}50%{opacity:1}}
.bl-err{
  font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--brick);
  border-left:3px solid var(--brick);padding:8px 0 8px 14px;margin-top:18px;
}

/* Report */
.bl-report{margin-top:30px;animation:bl-rise .5s cubic-bezier(.2,.7,.2,1) both}
@keyframes bl-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.bl-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;
  border-bottom:1px solid var(--rule);padding-bottom:12px}
.bl-co{font-size:clamp(21px,4vw,28px);font-weight:600;line-height:1.05}
.bl-tick{font-family:'IBM Plex Mono',monospace;font-size:13px;letter-spacing:.16em;color:var(--ink-soft);margin-top:3px}
.bl-price{font-family:'IBM Plex Mono',monospace;font-size:clamp(20px,4vw,26px);font-weight:600;text-align:right}
.bl-price small{display:block;font-size:11px;font-weight:400;letter-spacing:.14em;color:var(--ink-soft);text-transform:uppercase}
.bl-line1{font-style:italic;font-size:16px;color:var(--ink-soft);margin:14px 0 4px;line-height:1.45}

/* Ledger figures */
.bl-figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:0;
  border-top:1px solid var(--rule);margin-top:20px}
.bl-fig{border-bottom:1px dotted var(--rule);padding:9px 12px 9px 0}
.bl-fig dt{font-family:'IBM Plex Sans',sans-serif;font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--ink-soft);font-weight:600}
.bl-fig dd{font-family:'IBM Plex Mono',monospace;font-size:17px;font-weight:500;margin:2px 0 0;
  font-variant-numeric:tabular-nums}

/* Scorecard */
.bl-section{font-family:'IBM Plex Sans',sans-serif;font-size:11px;letter-spacing:.3em;
  text-transform:uppercase;color:var(--ink-soft);font-weight:600;margin:34px 0 8px;
  display:flex;align-items:center;gap:12px}
.bl-section::after{content:"";flex:1;height:1px;background:var(--rule)}
.bl-tenet{display:grid;grid-template-columns:1fr auto;gap:4px 14px;
  padding:13px 0;border-bottom:1px solid var(--paper-line)}
.bl-tname{font-size:17px;font-weight:500}
.bl-tnote{font-size:14.5px;color:var(--ink-soft);grid-column:1;line-height:1.4;font-style:italic}
.bl-tright{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.bl-pips{font-family:'IBM Plex Mono',monospace;font-size:14px;letter-spacing:2px;color:var(--moat)}
.bl-pips .off{color:var(--rule)}
.bl-band{font-family:'IBM Plex Sans',sans-serif;font-size:10px;letter-spacing:.1em;
  text-transform:uppercase;font-weight:600;color:var(--ink-soft);white-space:nowrap}

/* Verdict letter — the signature element */
.bl-verdict{margin-top:32px;background:#F6F7F0;border:1px solid var(--rule);
  border-left:4px solid var(--brass);padding:clamp(18px,4vw,30px);position:relative}
.bl-vlabel{font-family:'IBM Plex Sans',sans-serif;font-size:11px;letter-spacing:.16em;
  text-transform:uppercase;font-weight:600;display:inline-block;padding:4px 11px;margin-bottom:14px}
.bl-vletter{font-size:clamp(17px,3vw,20px);line-height:1.62;font-weight:400}
.bl-vletter::first-letter{font-size:2.9em;line-height:.82;float:left;padding:6px 10px 0 0;
  font-weight:600;color:var(--brass)}
.bl-sig{margin-top:20px;padding-top:14px;border-top:1px dotted var(--rule);
  display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
.bl-signame{font-family:'Newsreader',serif;font-style:italic;font-size:20px;color:var(--ink)}
.bl-sigrole{font-family:'IBM Plex Sans',sans-serif;font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--ink-soft)}
.bl-intrinsic{font-style:italic;color:var(--ink-soft);font-size:15px;margin-top:12px;line-height:1.5}

.bl-foot{font-family:'IBM Plex Sans',sans-serif;font-size:11px;color:var(--ink-soft);
  margin-top:28px;padding-top:14px;border-top:1px solid var(--rule);line-height:1.5}

/* Reverse DCF */
.bl-dcf{margin-top:6px}
.bl-basis{display:flex;align-items:center;gap:14px;margin-bottom:20px;flex-wrap:wrap}
.bl-basis-lbl{font-family:'IBM Plex Sans',sans-serif;font-size:10px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--ink-soft);font-weight:600}
.bl-seg{display:inline-flex;border:1.5px solid var(--ink)}
.bl-seg-btn{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:500;
  background:transparent;color:var(--ink);border:none;border-right:1px solid var(--rule);
  padding:6px 15px;cursor:pointer;transition:background .12s ease,color .12s ease;letter-spacing:.04em}
.bl-seg-btn:last-child{border-right:none}
.bl-seg-btn.on{background:var(--ink);color:var(--paper)}
.bl-seg-btn:disabled{color:#B4BAAB;cursor:not-allowed}
.bl-seg-btn:not(.on):not(:disabled):hover{background:#E3E7DA}
.bl-seg-btn:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.bl-dcf-main{display:flex;gap:26px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
.bl-implied{flex:1;min-width:220px}
.bl-implied-num{font-family:'IBM Plex Mono',monospace;font-weight:600;
  font-size:clamp(42px,10vw,68px);line-height:.92;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.bl-implied-cap{font-style:italic;color:var(--ink-soft);font-size:15px;max-width:34ch;margin-top:8px;line-height:1.4}
.bl-demandchip{display:inline-block;margin-top:12px;font-family:'IBM Plex Sans',sans-serif;
  font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:600;padding:4px 12px}
.bl-assume{display:grid;grid-template-columns:1fr;gap:12px;min-width:150px;
  border-left:1px solid var(--rule);padding-left:22px}
.bl-assume-field label{font-family:'IBM Plex Sans',sans-serif;font-size:10px;letter-spacing:.13em;
  text-transform:uppercase;color:var(--ink-soft);font-weight:600;display:block;margin-bottom:3px}
.bl-stepper{display:flex;align-items:baseline;gap:5px;border-bottom:1.5px solid var(--ink)}
.bl-stepper input{width:56px;background:transparent;border:none;outline:none;
  font-family:'IBM Plex Mono',monospace;font-size:19px;font-weight:500;color:var(--ink);
  font-variant-numeric:tabular-nums;padding:2px 0}
.bl-stepper input:focus-visible{color:var(--moat)}
.bl-stepper span{font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft)}
.bl-oe{font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:var(--ink-soft);
  margin-top:22px;padding-top:12px;border-top:1px dotted var(--rule);line-height:1.5}
.bl-oe strong{color:var(--ink);font-weight:600}
.bl-plaus{font-style:italic;font-size:15px;color:var(--ink-soft);margin-top:8px;line-height:1.5}
.bl-plaus em{color:var(--ink);font-style:italic}
.bl-gap{font-size:16.5px;line-height:1.55;margin-top:16px;padding:12px 0 12px 16px;border-left:3px solid var(--rule)}
.bl-gap-good{border-left-color:var(--moat);color:var(--ink)}
.bl-gap-fair{border-left-color:var(--brass);color:var(--ink)}
.bl-gap-warn{border-left-color:#9C5A22;color:var(--ink)}
.bl-gap-bad{border-left-color:var(--brick);color:var(--ink)}
.bl-nofcf{font-size:16.5px;line-height:1.6;color:var(--ink);background:#EEE7DC;
  border-left:4px solid var(--brass);padding:16px 20px;margin-top:4px}
.bl-nofcf strong{color:var(--brick)}

@media (prefers-reduced-motion:reduce){
  .bl-dot,.bl-report{animation:none}
}
`;

// verdict label → accent color
function verdictColor(label = "") {
  const l = label.toLowerCase();
  if (l.includes("wonderful")) return { bg: "#DCEAE2", fg: "#2C6A5B" };
  if (l.includes("good business")) return { bg: "#E7EBD6", fg: "#5E6A2C" };
  if (l.includes("fair business")) return { bg: "#EFEAD6", fg: "#8A6B22" };
  if (l.includes("patience")) return { bg: "#EDE6D9", fg: "#9C7A33" };
  if (l.includes("outside")) return { bg: "#EAE1DB", fg: "#7A5A4A" };
  return { bg: "#EEDCD6", fg: "#9E3F2C" }; // pass / caution
}

function Pips({ score = 0 }) {
  const n = Math.max(0, Math.min(5, Math.round(score)));
  return (
    <span className="bl-pips" aria-label={`${n} of 5`}>
      {"◆".repeat(n)}
      <span className="off">{"◇".repeat(5 - n)}</span>
    </span>
  );
}

function fmt(v, kind) {
  if (v === null || v === undefined || v === "") return "—";
  const num = typeof v === "string" ? parseFloat(v.replace(/[^0-9.\-]/g, "")) : v;
  if (kind === "pct") return (typeof num === "number" && !isNaN(num)) ? `${num.toFixed(1)}%` : String(v);
  if (kind === "big") {
    if (typeof num !== "number" || isNaN(num)) return String(v);
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(0)}M`;
    return `$${num.toLocaleString()}`;
  }
  if (kind === "x") return (typeof num === "number" && !isNaN(num)) ? `${num.toFixed(1)}×` : String(v);
  if (kind === "usd") return (typeof num === "number" && !isNaN(num)) ? `$${num.toFixed(2)}` : String(v);
  return String(v);
}

async function callClaude(system, userText, { mcp = false } = {}) {
  const body = {
    model: "claude-sonnet-5",
    max_tokens: 1000,
    system,
    messages: [{ role: "user", content: userText }],
    tools: [{ type: "web_search_20250305", name: "web_search" }],
  };
  if (mcp) body.mcp_servers = [ROBINHOOD_MCP];

  // Proxied through the local dev server (server/index.js), which holds the
  // real Anthropic API key — the browser never sees it.
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function extractJson(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in model reply");
  return JSON.parse(clean.slice(start, end + 1));
}

// ── Reverse DCF ─────────────────────────────────────────────────────────
// Two-stage owner-earnings model (N years of growth → Gordon terminal),
// solved backwards: take market cap as given, find the growth rate g that
// makes intrinsic value equal today's price. Pure deterministic math —
// the model never guesses this number.
function reverseDCF({ marketCap, fcf, r, gterm, N }) {
  if (!(marketCap > 0) || !(fcf > 0)) return null;
  if (r <= gterm) r = gterm + 0.005; // terminal must be finite
  const iv = (g) => {
    let pv = 0;
    for (let t = 1; t <= N; t++) pv += (fcf * Math.pow(1 + g, t)) / Math.pow(1 + r, t);
    const fcfN = fcf * Math.pow(1 + g, N);
    pv += (fcfN * (1 + gterm)) / (r - gterm) / Math.pow(1 + r, N);
    return pv;
  };
  let lo = -0.6, hi = 1.0;
  if (marketCap < iv(lo)) return { growth: lo, boundary: "below" }; // priced for steep decline
  if (marketCap > iv(hi)) return { growth: hi, boundary: "above" }; // priced beyond +100%/yr
  for (let i = 0; i < 90; i++) {
    const mid = (lo + hi) / 2;
    if (iv(mid) < marketCap) lo = mid; else hi = mid;
  }
  return { growth: (lo + hi) / 2, boundary: null };
}

// How demanding is an implied growth rate, on its own terms? (base rates:
// very few businesses compound owner-earnings above ~15% for a decade.)
function demandBand(g) {
  if (g == null) return { label: "Undefined", color: "#7A5A4A", bg: "#EAE1DB" };
  const p = g * 100;
  if (p < 0) return { label: "Priced for decline", color: "#2C6A5B", bg: "#DCEAE2" };
  if (p < 5) return { label: "Modest", color: "#2C6A5B", bg: "#DCEAE2" };
  if (p < 10) return { label: "Reasonable", color: "#5E6A2C", bg: "#E7EBD6" };
  if (p < 15) return { label: "Demanding", color: "#8A6B22", bg: "#EFEAD6" };
  if (p < 20) return { label: "Aggressive", color: "#9C5A22", bg: "#EEE2D2" };
  return { label: "Heroic", color: "#9E3F2C", bg: "#EEDCD6" };
}

// implied (from price) vs plausible (from the business) → the verdict
function gapRead(implied, plausible) {
  if (implied == null || plausible == null) return null;
  const d = (implied - plausible) * 100;
  if (d <= -3) return { text: "The market is pricing in less than this business can likely deliver — the kind of gap that creates a margin of safety.", tone: "good" };
  if (d < 3) return { text: "The growth priced in sits roughly where the business could plausibly sustain it — little cushion either way.", tone: "fair" };
  if (d < 7) return { text: "The price already demands more growth than the business is likely to sustain — the margin of safety is thin.", tone: "warn" };
  return { text: "The price bakes in growth well beyond what this business has any track record of sustaining — you are paying for optimism, not value.", tone: "bad" };
}

// Owner-earnings basis options: trailing (1yr) vs 3- and 5-year averages, so
// a single lumpy capex year doesn't distort the implied number for cyclicals.
function fcfBases(figures) {
  const ttm = typeof figures.freeCashFlow === "number" ? figures.freeCashFlow : null;
  const hist = Array.isArray(figures.fcfHistory)
    ? figures.fcfHistory.filter((x) => typeof x === "number") : [];
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const oneYr = ttm != null ? ttm : (hist.length ? hist[0] : null);
  const three = hist.length ? avg(hist.slice(0, 3)) : (ttm != null ? ttm : null);
  const five = hist.length ? avg(hist.slice(0, 5)) : (ttm != null ? ttm : null);
  return {
    "1": { value: oneYr, tag: ttm != null ? "TTM" : "latest FY", years: 1 },
    "3": { value: three, tag: `${Math.max(1, Math.min(3, hist.length || 1))}-yr avg`, years: Math.min(3, hist.length || 1) },
    "5": { value: five, tag: `${Math.max(1, Math.min(5, hist.length || 1))}-yr avg`, years: Math.min(5, hist.length || 1) },
  };
}
function defaultBasis(bases) {
  if (!bases) return "1";
  if (bases["3"].value > 0) return "3"; // normalized owner earnings preferred
  if (bases["1"].value > 0) return "1";
  if (bases["5"].value > 0) return "5";
  return "1";
}

const GATHER_SYS = `You are a financial-data retrieval assistant. For the given US-listed ticker, use the Robinhood tools (get_equity_fundamentals, get_equity_quotes) to fetch current figures. If a Robinhood tool is unavailable or empty, use web_search. Return ONLY a minified JSON object — no prose, no markdown fences — with keys: name, price (number), currency, marketCap (number, total USD), pe (number), pb (number), roe (percent number), netMargin (percent number), operatingMargin (percent number), debtToEquity (number), dividendYield (percent number), sector, businessLine (one plain sentence on what the company sells), freeCashFlow (trailing-twelve-month total free cash flow in USD, i.e. operating cash flow minus capital expenditures — a signed number that may be negative), netIncome (TTM total USD, fallback if FCF unknown), revenueCagr5y (percent number, ~5-year revenue CAGR if findable), fcfHistory (array of the last up to 5 completed fiscal years of annual free cash flow in USD, ordered most-recent-first; each a signed number that may be negative; use [] if unavailable). Use null for anything you cannot verify. freeCashFlow and marketCap are the most important — search for them if the Robinhood tools omit them. Never invent values.`;

const ANALYZE_SYS = `You apply Warren Buffett's documented investment framework — drawn from decades of Berkshire Hathaway shareholder letters — to judge a company as a long-term owner would. Use his real principles: stay inside a circle of competence; demand a durable economic moat (pricing power, low capital intensity, high returns on capital); insist on rational management and sound capital allocation; value owner earnings and consistent cash generation; require financial strength with modest debt; and buy only with a margin of safety against a conservative estimate of intrinsic value. Reason like an owner buying the whole business to hold for decades, not a trader.

Write plainly and candidly, in the rational spirit of his letters — but DO NOT fabricate or attribute any direct quotations to Warren Buffett.

You will also be given IMPLIED_GROWTH: the annual owner-earnings growth rate, computed by a reverse discounted-cash-flow model, that today's market price already assumes over the next decade. Treat this number as fact and reason from it. Your job on valuation is to judge the growth this specific business can PLAUSIBLY sustain, independent of its price, and let the Margin of Safety tenet and the verdict turn on the gap between the two.

Given the company data (some fields may be null — reason conservatively and note the gap rather than guessing), return ONLY a minified JSON object with keys:
- businessSummary: one plain sentence anyone can understand
- inCircle: boolean (simple and predictable enough to value with confidence?)
- ownerEarningsBasis: short phrase naming what real owner-earnings power rests on (e.g. "trailing free cash flow", "not yet free-cash-flow positive")
- plausibleGrowthPct: number — your conservative estimate of the annual owner-earnings growth this business can sustain over ~10 years, grounded in its moat, reinvestment runway, margins, and history (may exceed 15 only for truly exceptional franchises)
- plausibleGrowthNote: one sentence justifying that estimate
- tenets: array of exactly 6 objects {name, score (integer 1-5), band (2-4 word label), note (one sentence)} in this order: "Circle of Competence", "Economic Moat", "Management & Capital Allocation", "Financial Strength", "Owner Earnings", "Margin of Safety" — the Margin of Safety note must compare IMPLIED_GROWTH to your plausibleGrowthPct
- intrinsicView: one sentence on how today's price relates to a conservative sense of intrinsic value, referencing the implied-vs-plausible growth gap
- verdictLabel: exactly one of "Wonderful business, fair price", "Good business, rich price", "Fair business, fair price", "Requires patience", "Outside the circle", "Pass for now"
- verdictLetter: a 3-5 sentence assessment addressed to a fellow shareholder, weighing moat, management, and price, ending with the disposition. No fabricated quotes, no markdown.`;

export default function App() {
  const [ticker, setTicker] = useState("");
  const [stage, setStage] = useState("idle"); // idle | gathering | analyzing | done | error
  const [figures, setFigures] = useState(null);
  const [report, setReport] = useState(null);
  const [err, setErr] = useState("");
  const [dcfR, setDcfR] = useState(0.10);   // required return / discount rate
  const [dcfG, setDcfG] = useState(0.03);   // terminal growth
  const [dcfN, setDcfN] = useState(10);     // high-growth horizon (years)
  const [fcfBasis, setFcfBasis] = useState("1"); // "1" | "3" | "5" owner-earnings window
  const shownTicker = useRef("");

  const busy = stage === "gathering" || stage === "analyzing";

  async function run() {
    const t = ticker.trim().toUpperCase();
    if (!t || busy) return;
    setErr(""); setReport(null); setFigures(null);
    shownTicker.current = t;
    try {
      setStage("gathering");
      const gatherRaw = await callClaude(GATHER_SYS, `Ticker: ${t}`, { mcp: true });
      const figs = extractJson(gatherRaw);
      setFigures(figs);

      // owner-earnings basis options (1/3/5-yr) and deterministic baseline solve
      const bs = fcfBases(figs);
      const basis = defaultBasis(bs);
      setFcfBasis(basis);
      const baseFcf = bs[basis].value;
      const basisWord = basis === "1" ? "trailing" : `${bs[basis].years}-year average`;
      const solved = reverseDCF({ marketCap: figs.marketCap, fcf: baseFcf, r: 0.10, gterm: 0.03, N: 10 });
      const impliedTxt = solved
        ? `IMPLIED_GROWTH: using ${basisWord} owner earnings, today's price implies about ${(solved.growth * 100).toFixed(1)}% annual growth for 10 years` +
          (solved.boundary === "above" ? " (at least — beyond a +100%/yr scenario)." :
           solved.boundary === "below" ? " (the price implies outright decline in owner earnings)." : ".")
        : `IMPLIED_GROWTH: not computable from ${basisWord} owner earnings — the company is not free-cash-flow positive on this basis, so its price rests on future profitability rather than present owner earnings.`;

      setStage("analyzing");
      const analyzeRaw = await callClaude(
        ANALYZE_SYS,
        `Company data (JSON):\n${JSON.stringify(figs)}\n\n${impliedTxt}`
      );
      const rep = extractJson(analyzeRaw);
      setReport(rep);
      setStage("done");
    } catch (e) {
      setErr(e.message || "Something went wrong reading the ledger.");
      setStage("error");
    }
  }

  const vc = report ? verdictColor(report.verdictLabel) : null;

  // owner-earnings basis + live implied growth (recompute in-browser, no API call)
  const bases = useMemo(() => (figures ? fcfBases(figures) : null), [figures]);
  const baseFcf = bases && bases[fcfBasis] ? bases[fcfBasis].value : null;
  const anyPositive = !!bases && ["1", "3", "5"].some((k) => bases[k].value > 0);
  const implied = useMemo(() => {
    if (!figures) return null;
    return reverseDCF({ marketCap: figures.marketCap, fcf: baseFcf, r: dcfR, gterm: dcfG, N: dcfN });
  }, [figures, baseFcf, dcfR, dcfG, dcfN]);

  const impliedPct = implied ? implied.growth * 100 : null;
  const band = demandBand(implied ? implied.growth : null);
  const plausible = report && typeof report.plausibleGrowthPct === "number" ? report.plausibleGrowthPct : null;
  const gap = implied && plausible != null ? gapRead(implied.growth, plausible / 100) : null;

  return (
    <div className="bl-root">
      <style>{STYLES}</style>
      <div className="bl-wrap">

        <header className="bl-masthead">
          <div className="bl-eyebrow">A Letter to the Shareholder · Est. principles, 1965–today</div>
          <h1 className="bl-title">Through <em>Buffett's</em> Eyes</h1>
          <p className="bl-sub">
            Enter a ticker. It is read as an owner would read it — for the moat, the
            people running it, the cash it throws off, and the price you must pay.
          </p>
        </header>

        <div className="bl-console">
          <input
            className="bl-input"
            placeholder="TICKER"
            value={ticker}
            maxLength={6}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && run()}
            aria-label="Stock ticker"
            spellCheck={false}
          />
          <button className="bl-btn" onClick={run} disabled={busy}>
            {busy ? "Reading…" : "Appraise"}
          </button>
        </div>
        <div className="bl-hint">Live figures via your Robinhood connection · long-term owner's view, not a trade signal</div>

        {stage === "gathering" && (
          <div className="bl-status"><span className="bl-dot" />Pulling the books on {shownTicker.current}…</div>
        )}
        {stage === "analyzing" && (
          <div className="bl-status"><span className="bl-dot" />Weighing {shownTicker.current} against the framework…</div>
        )}
        {stage === "error" && <div className="bl-err">✗ {err}</div>}

        {report && figures && (
          <section className="bl-report">
            <div className="bl-head">
              <div>
                <div className="bl-co">{figures.name || shownTicker.current}</div>
                <div className="bl-tick">{shownTicker.current}{figures.sector ? ` · ${figures.sector}` : ""}</div>
              </div>
              {figures.price != null && (
                <div className="bl-price">{fmt(figures.price, "usd")}<small>Last price</small></div>
              )}
            </div>

            <p className="bl-line1">{report.businessSummary}</p>

            <dl className="bl-figs">
              <div className="bl-fig"><dt>Market Cap</dt><dd>{fmt(figures.marketCap, "big")}</dd></div>
              <div className="bl-fig"><dt>P / E</dt><dd>{fmt(figures.pe, "x")}</dd></div>
              <div className="bl-fig"><dt>Price / Book</dt><dd>{fmt(figures.pb, "x")}</dd></div>
              <div className="bl-fig"><dt>Return on Equity</dt><dd>{fmt(figures.roe, "pct")}</dd></div>
              <div className="bl-fig"><dt>Net Margin</dt><dd>{fmt(figures.netMargin, "pct")}</dd></div>
              <div className="bl-fig"><dt>Op. Margin</dt><dd>{fmt(figures.operatingMargin, "pct")}</dd></div>
              <div className="bl-fig"><dt>Debt / Equity</dt><dd>{fmt(figures.debtToEquity, "x")}</dd></div>
              <div className="bl-fig"><dt>Div. Yield</dt><dd>{fmt(figures.dividendYield, "pct")}</dd></div>
            </dl>

            <div className="bl-section">The Six Tenets</div>
            {(report.tenets || []).map((t, i) => (
              <div className="bl-tenet" key={i}>
                <div className="bl-tname">{t.name}</div>
                <div className="bl-tright">
                  <Pips score={t.score} />
                  <span className="bl-band">{t.band}</span>
                </div>
                <div className="bl-tnote">{t.note}</div>
              </div>
            ))}

            <div className="bl-section">The Price's Hidden Forecast</div>
            {anyPositive ? (
              <div className="bl-dcf">
                <div className="bl-basis">
                  <span className="bl-basis-lbl">Owner-earnings basis</span>
                  <div className="bl-seg" role="group" aria-label="Owner-earnings averaging window">
                    {["1", "3", "5"].map((k) => {
                      const ok = bases[k].value > 0;
                      const on = fcfBasis === k;
                      return (
                        <button key={k}
                          className={`bl-seg-btn${on ? " on" : ""}`}
                          disabled={!ok}
                          title={ok ? `${fmt(bases[k].value, "big")} · ${bases[k].tag}` : "No data for this window"}
                          onClick={() => setFcfBasis(k)}>
                          {k}-yr
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bl-dcf-main">
                  <div className="bl-implied">
                    {implied ? (
                      <>
                        <div className="bl-implied-num" style={{ color: band.color }}>
                          {implied.boundary === "above" ? "≥ +100%"
                            : implied.boundary === "below" ? "≤ −60%"
                            : `${impliedPct >= 0 ? "+" : "−"}${Math.abs(impliedPct).toFixed(1)}%`}
                        </div>
                        <div className="bl-implied-cap">
                          annual owner-earnings growth the price bakes in, every year for {dcfN} years
                        </div>
                        <span className="bl-demandchip" style={{ background: band.bg, color: band.color }}>
                          {band.label}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="bl-implied-num" style={{ color: "var(--ink-soft)" }}>—</div>
                        <div className="bl-implied-cap">
                          Owner earnings aren't positive on the {fcfBasis}-year basis — the reverse-DCF has
                          nothing to solve against here. Try another window.
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bl-assume">
                    <div className="bl-assume-field">
                      <label htmlFor="dcf-r">Required return</label>
                      <div className="bl-stepper">
                        <input id="dcf-r" type="number" min="6" max="15" step="0.5"
                          value={(dcfR * 100).toFixed(1)}
                          onChange={(e) => setDcfR(Math.max(6, Math.min(15, +e.target.value)) / 100)} />
                        <span>%</span>
                      </div>
                    </div>
                    <div className="bl-assume-field">
                      <label htmlFor="dcf-g">Terminal growth</label>
                      <div className="bl-stepper">
                        <input id="dcf-g" type="number" min="0" max="4" step="0.5"
                          value={(dcfG * 100).toFixed(1)}
                          onChange={(e) => setDcfG(Math.max(0, Math.min(dcfR * 100 - 0.5, +e.target.value)) / 100)} />
                        <span>%</span>
                      </div>
                    </div>
                    <div className="bl-assume-field">
                      <label htmlFor="dcf-n">Growth horizon</label>
                      <div className="bl-stepper">
                        <input id="dcf-n" type="number" min="5" max="15" step="1"
                          value={dcfN}
                          onChange={(e) => setDcfN(Math.max(5, Math.min(15, Math.round(+e.target.value))))} />
                        <span>yrs</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bl-oe">
                  Basis · {bases[fcfBasis].tag} free cash flow of {fmt(baseFcf, "big")}
                  {plausible != null && (
                    <> &nbsp;·&nbsp; this business can plausibly sustain ~<strong>{plausible.toFixed(0)}%</strong></>
                  )}
                </div>
                {report.plausibleGrowthNote && (
                  <div className="bl-plaus"><em>Why:</em> {report.plausibleGrowthNote}</div>
                )}
                {gap && <div className={`bl-gap bl-gap-${gap.tone}`}>{gap.text}</div>}
              </div>
            ) : (
              <div className="bl-nofcf">
                <strong>No positive owner earnings to discount.</strong> {figures.name || shownTicker.current} isn't
                free-cash-flow positive on any available window, so a reverse-DCF has nothing to solve against — the
                whole price rests on profits that don't yet exist. That isn't automatically damning, but it means the
                market is buying a forecast, not a stream of cash. Buffett's instinct here is caution: a business that
                can't be valued on what it earns today sits, by definition, near the edge of the circle.
              </div>
            )}

            <div className="bl-verdict">
              <span className="bl-vlabel" style={{ background: vc.bg, color: vc.fg }}>
                {report.verdictLabel}
              </span>
              <p className="bl-vletter">{report.verdictLetter}</p>
              {report.intrinsicView && (
                <p className="bl-intrinsic">On price & value — {report.intrinsicView}</p>
              )}
              <div className="bl-sig">
                <span className="bl-signame">In the manner of the Oracle</span>
                <span className="bl-sigrole">
                  {report.inCircle ? "Within the circle of competence" : "At the edge of the circle"}
                </span>
              </div>
            </div>

            <p className="bl-foot">
              Figures are pulled live and may lag the market. This is an educational appraisal in the
              style of Buffett's own principles — not investment advice, and it invents no quotations
              attributed to him. The final judgment, as always, is yours to make.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
