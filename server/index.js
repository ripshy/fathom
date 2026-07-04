import "dotenv/config";
import express from "express";

const PORT = process.env.PORT || 8787;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const FMP_API_KEY = process.env.FMP_API_KEY;

if (!API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY — set it in .env before starting the server.");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "2mb" }));

// Per-MTok pricing by model. Sonnet 5 is at its introductory rate through
// 2026-08-31 (reverts to $3/$15 after).
const PRICE_PER_MTOK_BY_MODEL = {
  "claude-sonnet-5": { input: 2.0, output: 10.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};
const DEFAULT_PRICE = PRICE_PER_MTOK_BY_MODEL["claude-sonnet-5"];
const WEB_SEARCH_PER_CALL = 0.01; // $10 / 1,000 searches

const WARN_THRESHOLD_USD = Number(process.env.COST_WARN_THRESHOLD || 0.03);

const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, webSearches: 0, requests: 0, costUsd: 0 };

function estimateCostUsd(model, usage) {
  const price = PRICE_PER_MTOK_BY_MODEL[model] || DEFAULT_PRICE;
  const cacheWritePerMtok = price.input * 1.25; // assumes the default 5-min TTL — this app never sets cache_control
  const cacheReadPerMtok = price.input * 0.1;

  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const webSearches = (usage.server_tool_use && usage.server_tool_use.web_search_requests) || 0;

  return (
    (input / 1e6) * price.input +
    (output / 1e6) * price.output +
    (cacheRead / 1e6) * cacheReadPerMtok +
    (cacheWrite / 1e6) * cacheWritePerMtok +
    webSearches * WEB_SEARCH_PER_CALL
  );
}

function logUsage(model, usage) {
  if (!usage) return;
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const webSearches = (usage.server_tool_use && usage.server_tool_use.web_search_requests) || 0;
  const costUsd = estimateCostUsd(model, usage);

  totals.input += input;
  totals.output += output;
  totals.cacheRead += cacheRead;
  totals.cacheWrite += cacheWrite;
  totals.webSearches += webSearches;
  totals.requests += 1;
  totals.costUsd += costUsd;

  console.log(
    `[usage] req#${totals.requests} model=${model} in=${input} out=${output} cacheRead=${cacheRead} cacheWrite=${cacheWrite}` +
      ` webSearches=${webSearches} cost=$${costUsd.toFixed(4)}` +
      ` | session totals: cost=$${totals.costUsd.toFixed(4)} in=${totals.input} out=${totals.output}`
  );

  if (costUsd > WARN_THRESHOLD_USD) {
    console.warn(`[usage] ⚠ request cost $${costUsd.toFixed(4)} exceeded warn threshold $${WARN_THRESHOLD_USD.toFixed(4)}`);
  }
}

app.get("/api/usage", (req, res) => {
  res.json(totals);
});

const FMP_BASE = "https://financialmodelingprep.com/stable";

async function fmpGet(path, params) {
  const url = new URL(`${FMP_BASE}/${path}`);
  url.searchParams.set("apikey", FMP_API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP ${path} ${res.status}`);
  return res.json();
}

const pct = (x) => (typeof x === "number" ? x * 100 : null);
const num = (x) => (typeof x === "number" ? x : null);

app.get("/api/fundamentals/:ticker", async (req, res) => {
  if (!FMP_API_KEY) {
    return res.status(500).json({ error: "FMP_API_KEY not configured — set it in .env" });
  }
  const symbol = req.params.ticker.toUpperCase();

  try {
    const [profileArr, ratiosArr, metricsArr, cashFlowArr, incomeArr] = await Promise.all([
      fmpGet("profile", { symbol }),
      fmpGet("ratios-ttm", { symbol }),
      fmpGet("key-metrics-ttm", { symbol }),
      fmpGet("cash-flow-statement", { symbol, period: "annual", limit: 5 }),
      fmpGet("income-statement", { symbol, period: "annual", limit: 5 }),
    ]);
    const profile = profileArr?.[0] || {};
    const ratios = ratiosArr?.[0] || {};
    const metrics = metricsArr?.[0] || {};
    const cashFlow = Array.isArray(cashFlowArr) ? cashFlowArr : [];
    const income = Array.isArray(incomeArr) ? incomeArr : [];

    if (!profile.companyName) {
      return res.status(404).json({ error: `No FMP data for ticker "${symbol}"` });
    }

    // FMP returns most-recent-first; keep that ordering to match what the
    // app's owner-earnings basis picker (1/3/5-yr) expects.
    const fcfHistory = cashFlow.slice(0, 5).map((x) => num(x.freeCashFlow));
    while (fcfHistory.length < 5) fcfHistory.push(null);

    let revenueCagr5y = null;
    if (income.length >= 2) {
      const newest = income[0].revenue;
      const oldest = income[income.length - 1].revenue;
      const years = income.length - 1;
      if (typeof newest === "number" && typeof oldest === "number" && oldest > 0) {
        revenueCagr5y = (Math.pow(newest / oldest, 1 / years) - 1) * 100;
      }
    }

    res.json({
      name: profile.companyName ?? null,
      price: num(profile.price),
      currency: profile.currency ?? "USD",
      marketCap: num(profile.marketCap),
      pe: num(ratios.priceToEarningsRatioTTM),
      pb: num(ratios.priceToBookRatioTTM),
      roe: pct(metrics.returnOnEquityTTM),
      netMargin: pct(ratios.netProfitMarginTTM),
      operatingMargin: pct(ratios.operatingProfitMarginTTM),
      debtToEquity: num(ratios.debtToEquityRatioTTM),
      dividendYield: pct(ratios.dividendYieldTTM),
      sector: profile.sector ?? null,
      businessLine: profile.description ? profile.description.split(/(?<=[.!?])\s/)[0] : null,
      freeCashFlow: fcfHistory[0],
      netIncome: num(income[0]?.netIncome),
      revenueCagr5y,
      fcfHistory,
    });
  } catch (err) {
    console.error("[fmp fundamentals failed]", err.message);
    res.status(502).json({ error: err.message || "FMP request failed" });
  }
});

app.post("/api/messages", async (req, res) => {
  const body = { ...req.body };

  const headers = {
    "content-type": "application/json",
    "x-api-key": API_KEY,
    "anthropic-version": "2023-06-01",
  };

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    try {
      logUsage(body.model, JSON.parse(text).usage);
    } catch {
      // non-JSON or error body — nothing to log
    }
    res.status(upstream.status).type("application/json").send(text);
  } catch (err) {
    console.error("[upstream fetch failed]", err.message, "| cause:", err.cause);
    res.status(502).json({ error: err.message || "Upstream request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Anthropic proxy listening on http://localhost:${PORT}`);
});
