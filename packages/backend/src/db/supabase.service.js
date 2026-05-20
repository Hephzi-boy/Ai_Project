const { randomUUID } = require("crypto");

function getConfig() {
  const baseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { baseUrl, serviceRoleKey };
}

function getHeaders() {
  const { serviceRoleKey } = getConfig();
  return {
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: "return=representation"
  };
}

async function saveConversation(params) {
  const { baseUrl, serviceRoleKey } = getConfig();
  const { hospitalId, sessionId, userMessage, assistantReply } = params;

  if (!baseUrl || !serviceRoleKey) {
    return { persisted: false, reason: "Supabase env not configured" };
  }
  if (!hospitalId) {
    return { persisted: false, reason: "hospitalId missing; skipping persistence" };
  }

  const resolvedSessionId = sessionId || randomUUID();
  const headers = getHeaders();

  const sessionPayload = {
    id: resolvedSessionId,
    hospital_id: hospitalId,
    channel: "api",
    agent_type: "faq",
    status: "open",
    trace_id: randomUUID()
  };

  const upsertSession = await fetch(`${baseUrl}/rest/v1/chat_sessions?on_conflict=id`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([sessionPayload])
  });

  if (!upsertSession.ok) {
    const err = await upsertSession.text();
    return { persisted: false, reason: `chat_sessions upsert failed: ${err}` };
  }

  const messagesPayload = [
    { session_id: resolvedSessionId, role: "user", content: String(userMessage || "") },
    { session_id: resolvedSessionId, role: "assistant", content: String(assistantReply || "") }
  ];

  const insertMessages = await fetch(`${baseUrl}/rest/v1/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify(messagesPayload)
  });

  if (!insertMessages.ok) {
    const err = await insertMessages.text();
    return { persisted: false, reason: `messages insert failed: ${err}` };
  }

  return { persisted: true, sessionId: resolvedSessionId };
}

module.exports = {
  saveConversation
};
