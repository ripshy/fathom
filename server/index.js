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
    res.status(upstream.status).type("application/json").send(text);
  } catch (err) {
    res.status(502).json({ error: err.message || "Upstream request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Anthropic proxy listening on http://localhost:${PORT}`);
});
