const http = require("http");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");
const { handleChatRoute } = require("./chat/chat.controller");
const { handleWhatsAppWebhook } = require("./whatsapp/whatsapp.controller");

const PORT = Number(process.env.APP_PORT || 4000);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const repoRoot = path.resolve(__dirname, "..", "..", "..");
loadEnvFile(path.join(repoRoot, "backend", ".env"));
loadEnvFile(path.join(repoRoot, ".env"));

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function computeUrgency(message) {
  const text = String(message || "").toLowerCase();
  if (text.includes("chest pain") || text.includes("difficulty breathing")) return "emergency";
  if (text.includes("severe") || text.includes("bleeding")) return "high";
  if (text.includes("pain") || text.includes("fever")) return "medium";
  return "low";
}

function buildResponse(body) {
  const urgency = computeUrgency(body.patientMessage);
  const emergency = urgency === "emergency";
  return {
    traceId: randomUUID(),
    response: emergency
      ? "This may be a medical emergency. Please contact emergency services immediately and proceed to the nearest ER."
      : "Message received. A hospital assistant will guide the next step.",
    urgency,
    actions: emergency
      ? [{ type: "escalate", reason: "Possible critical symptoms" }, { type: "notify", channel: "SMS", message: "Emergency triage alert raised." }]
      : [{ type: "none" }],
    toolResults: {
      availabilityChecked: false,
      mocked: true
    }
  };
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { status: "ok", service: "djed-ice-backend-mock" });
  }

  if (req.method === "POST" && req.url === "/ai/v1/chat") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        const body = JSON.parse(raw || "{}");
        if (!body.hospitalId || !body.sessionId || !body.patientMessage || !body.agentType) {
          return json(res, 400, { error: "hospitalId, sessionId, agentType and patientMessage are required." });
        }
        return json(res, 200, buildResponse(body));
      } catch (err) {
        return json(res, 400, { error: "Invalid JSON body." });
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/chat") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", async () => {
      try {
        const body = JSON.parse(raw || "{}");
        await handleChatRoute(req, res, body);
      } catch (err) {
        json(res, 400, { error: "Invalid JSON body." });
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/webhooks/twilio/whatsapp") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", async () => {
      try {
        await handleWhatsAppWebhook(req, res, raw);
      } catch (err) {
        json(res, 400, { error: "Invalid webhook payload." });
      }
    });
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`[djed-ice] mock backend running on http://localhost:${PORT}`);
});
