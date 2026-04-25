# JumysAI Telegram bot (Railway)

Runtime that talks **only** to Convex HTTP routes under `{CONVEX_SITE_URL}/v1/bot/*`. No direct database or Convex client SDK.

## Environment variables

The bot loads environment variables from the shell and, for local development, from these files if they exist:

1. `telegram-bot/.env.local`
2. `telegram-bot/.env`
3. root `.env.local`
4. root `.env`

Shell-provided variables keep priority over file values. Do not commit real secrets.

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) |
| `CONVEX_SITE_URL` | Convex **site** URL (ends with `.convex.site`), **not** the `.cloud` client URL |
| `BOT_SHARED_SECRET` | Same value as `BOT_SHARED_SECRET` on the Convex deployment |

Convex must also define `TELEGRAM_BOT_TOKEN` so server-side notification delivery can call the Telegram API.

## Scripts

- `npm run dev` — long polling with `tsx watch`
- `npm run build` — compile to `dist/`
- `npm start` — run `node dist/index.js`

From the repository root, `npm run dev:bot` starts only this bot and `npm run dev` starts Convex, web, and the bot together.

## Railway

1. Create a service from this repo; set **Root Directory** to `telegram-bot` (or deploy only this folder).
2. Set the three env vars above.
3. Start command: `npm start` (after `npm run build` in build step, or use Nixpacks with `build` + `start` from `package.json`).

Startup logs one JSON line with `event: telegram_bot_start` (host only, no secrets).

## Convex routes used

- `POST /v1/bot/users/upsert`
- `GET /v1/bot/vacancies` (e.g. `?region=aktau&source=native`)
- `POST /v1/bot/applications`
- `POST /v1/bot/notifications/send`
- `GET /v1/bot/users/notification-preferences?telegramChatId=…`
- `PATCH /v1/bot/users/notification-preferences`

Auth: header `x-bot-secret: <BOT_SHARED_SECRET>` on every request.
