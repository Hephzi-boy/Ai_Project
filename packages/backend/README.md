# Backend

Current state: runnable mock API using Node `http` at `src/mock-server.js`.

## Endpoints

- `GET /health`
- `POST /ai/v1/chat`
- `POST /chat`
- `POST /webhooks/twilio/whatsapp`

## Run

```bash
npm.cmd run dev:backend
```

## NestJS Upgrade Path

Move to this module structure as dependencies are installed:

```text
src/
  app.module.ts
  main.ts
  auth/
  ai/
    engine/
    agents/
    tools/
  conversation/
  hospital/
  integrations/
  compliance/
```

## Twilio WhatsApp Webhook

Set Twilio Sandbox incoming webhook to:

`https://<your-public-domain>/webhooks/twilio/whatsapp`

For local testing you can post form data:

```bash
curl -X POST http://localhost:4000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+2340000000000&Body=Book appointment for tomorrow"
```
