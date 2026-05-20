const { getChatReply } = require("../chat/chat.service");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function handleIncomingWhatsApp(formBody) {
  const incomingText = formBody?.Body || "";
  const from = formBody?.From || "unknown";

  const chat = await getChatReply(incomingText);
  const reply = chat?.reply || "I could not process your message right now.";

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Hi ${escapeXml(
    from
  )}, ${escapeXml(reply)}</Message></Response>`;

  return { twiml, reply };
}

module.exports = {
  handleIncomingWhatsApp
};
