const { saveConversation } = require("../db/supabase.service");

async function askCohere(message) {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    return "COHERE_API_KEY is not set yet. Add it to your backend env file.";
  }

  const response = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "command-a-03-2025",
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: "You are a hospital assistant. Keep replies clear, brief, and safe. If urgent symptoms are mentioned, advise emergency care."
        },
        { role: "user", content: String(message || "") }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cohere request failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data?.message?.content?.[0]?.text?.trim() || "I could not generate a response.";
}

async function getChatReply(payload) {
  const message = typeof payload === "string" ? payload : payload?.message;
  const hospitalId = typeof payload === "string" ? undefined : payload?.hospitalId;
  const sessionId = typeof payload === "string" ? undefined : payload?.sessionId;

  if (!message || !String(message).trim()) {
    return { reply: "Please provide a message." };
  }

  try {
    const reply = await askCohere(message);
    const dbResult = await saveConversation({
      hospitalId,
      sessionId,
      userMessage: message,
      assistantReply: reply
    });
    return { reply, storage: dbResult };
  } catch (error) {
    return {
      reply: "I could not reach AI right now. Please try again shortly.",
      error: error.message
    };
  }
}

module.exports = {
  getChatReply
};
