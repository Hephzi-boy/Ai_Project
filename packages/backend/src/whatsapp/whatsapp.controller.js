const { parse } = require("querystring");
const { handleIncomingWhatsApp } = require("./whatsapp.service");

async function handleWhatsAppWebhook(req, res, rawBody) {
  const contentType = String(req.headers["content-type"] || "");
  let parsedBody = {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    parsedBody = parse(rawBody || "");
  } else if (contentType.includes("application/json")) {
    parsedBody = JSON.parse(rawBody || "{}");
  }

  const result = await handleIncomingWhatsApp(parsedBody);

  res.writeHead(200, { "Content-Type": "text/xml; charset=utf-8" });
  res.end(result.twiml);
}

module.exports = {
  handleWhatsAppWebhook
};
