# Djed-Ice

Monorepo scaffold for a hospital AI orchestration platform.

## Packages

- `packages/backend`: NestJS-style backend skeleton and orchestrator flow (mock adapters by default)
- `packages/web-dashboard`: frontend placeholder for hospital admin dashboard
- `packages/shared`: shared TypeScript types
- `packages/ai-agents`: prompt and tool definition placeholders

## Quick Start

1. Copy `.env.example` to `.env`
2. Fill credentials as they become available
3. Run install:

```bash
npm.cmd install
```

4. Start backend:

```bash
npm.cmd run dev:backend
```

## Current Status

- Structure and contracts are in place.
- External integrations are mocked and ready to replace with real providers.
