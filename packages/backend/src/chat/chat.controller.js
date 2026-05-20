const { getChatReply } = require("./chat.service");

async function handleChatRoute(req, res, body) {
  const result = await getChatReply(body || {});
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
}

module.exports = {
  handleChatRoute
};
