# JumysAI Local Development

From the repository root, install dependencies for each package once:

```bash
npm install
npm --prefix web install
npm --prefix telegram-bot install
```

Then start the full local stack:

```bash
npm run dev
```

This starts:

- `dev:convex` - `convex dev`
- `dev:web` - Vite from `web/`
- `dev:bot` - Telegram long polling from `telegram-bot/`

Each package remains runnable independently with its own `npm run dev`.

## Environment

Web env belongs in `web/.env.local`:

- `VITE_CONVEX_URL` - Convex client URL, usually `https://<deployment>.convex.cloud`.
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key.
- `VITE_CLERK_JWT_TEMPLATE` - Clerk JWT template name, usually `convex`.

Root or bot env is loaded by the Telegram bot from the shell, `telegram-bot/.env.local`, `telegram-bot/.env`, root `.env.local`, or root `.env`:

- `TELEGRAM_BOT_TOKEN` - Telegram bot token.
- `CONVEX_SITE_URL` - Convex HTTP site URL, usually `https://<deployment>.convex.site`.
- `BOT_SHARED_SECRET` - shared secret expected by Convex bot HTTP routes.

Convex runtime variables must be configured on the Convex deployment as well:

- `BOT_SHARED_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `CLERK_JWT_ISSUER_DOMAIN`
- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_CHAT_MODEL`
- `OPENROUTER_COMPLEX_MODEL`
- `OPENROUTER_EMBEDDING_MODEL`

The Telegram bot talks only to Convex HTTP routes under `{CONVEX_SITE_URL}/v1/bot/*`; it does not use a direct Convex client.
