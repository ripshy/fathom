import "dotenv/config";
import express from "express";

const PORT = process.env.PORT || 8787;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const ROBINHOOD_MCP_TOKEN = process.env.ROBINHOOD_MCP_TOKEN;

if (!API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY — set it in .env before starting the server.");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/api/capabilities", (req, res) => {
  res.json({ robinhoodMcp: !!ROBINHOOD_MCP_TOKEN });
});

// claude-sonnet-5 pricing per MTok, introductory rate active through 2026-08-31
// (reverts to $3/$15 after). This proxy only ever calls that one model.
const PRICE_PER_MTOK = { input: 2.0, output: 10.0 };
const CACHE_WRITE_5M_PER_MTOK = PRICE_PER_MTOK.input * 1.25;
const CACHE_WRITE_1H_PER_MTOK = PRICE_PER_MTOK.input * 2;
const CACHE_READ_PER_MTOK = PRICE_PER_MTOK.input * 0.1;
const WEB_SEARCH_PER_CALL = 0.01; // $10 / 1,000 searches

const WARN_THRESHOLD_USD = Number(process.env.COST_WARN_THRESHOLD || 0.03);

const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, webSearches: 0, requests: 0, costUsd: 0 };

function estimateCostUsd(usage) {
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  // The API doesn't report which TTL a cache write used; assume the default
  // 5-minute TTL since this app never sets cache_control explicitly.
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const webSearches = (usage.server_tool_use && usage.server_tool_use.web_search_requests) || 0;

  return (
    (input / 1e6) * PRICE_PER_MTOK.input +
    (output / 1e6) * PRICE_PER_MTOK.output +
    (cacheRead / 1e6) * CACHE_READ_PER_MTOK +
    (cacheWrite / 1e6) * CACHE_WRITE_5M_PER_MTOK +
    webSearches * WEB_SEARCH_PER_CALL
  );
}

function logUsage(usage) {
  if (!usage) return;
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const webSearches = (usage.server_tool_use && usage.server_tool_use.web_search_requests) || 0;
  const costUsd = estimateCostUsd(usage);

  totals.input += input;
  totals.output += output;
  totals.cacheRead += cacheRead;
  totals.cacheWrite += cacheWrite;
  totals.webSearches += webSearches;
  totals.requests += 1;
  totals.costUsd += costUsd;

  console.log(
    `[usage] req#${totals.requests} in=${input} out=${output} cacheRead=${cacheRead} cacheWrite=${cacheWrite}` +
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

app.post("/api/messages", async (req, res) => {
  const body = { ...req.body };

  // Attach a Robinhood MCP auth token if the caller asked for the connector
  // and one is configured. Without it, a hosted MCP server that requires
  // OAuth will reject the connection.
  if (Array.isArray(body.mcp_servers) && ROBINHOOD_MCP_TOKEN) {
    body.mcp_servers = body.mcp_servers.map((s) => ({
      ...s,
      authorization_token: s.authorization_token || ROBINHOOD_MCP_TOKEN,
    }));
  }

  const headers = {
    "content-type": "application/json",
    "x-api-key": API_KEY,
    "anthropic-version": "2023-06-01",
  };
  if (Array.isArray(body.mcp_servers) && body.mcp_servers.length) {
    headers["anthropic-beta"] = "mcp-client-2025-04-04";
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    try {
      logUsage(JSON.parse(text).usage);
    } catch {
      // non-JSON or error body — nothing to log
    }
    res.status(upstream.status).type("application/json").send(text);
  } catch (err) {
    res.status(502).json({ error: err.message || "Upstream request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Anthropic proxy listening on http://localhost:${PORT}`);
});
