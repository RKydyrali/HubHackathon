# JumysAI Web

Vite React app for the JumysAI frontend. It remains runnable on its own from this directory, and it is also started by the root `npm run dev` command.

## Environment

Copy `.env.example` to `.env.local` in this directory.

| Variable | Description |
| --- | --- |
| `VITE_CONVEX_URL` | Convex client URL for the web app, usually `https://<deployment>.convex.cloud`. Do not use the `.convex.site` HTTP URL here. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for the frontend. |
| `VITE_CLERK_JWT_TEMPLATE` | Clerk JWT template name used for Convex auth. Defaults to `convex`. |
| `VITE_TELEGRAM_BOT_URL` | Public Telegram bot link shown in the UI. |

## Scripts

- `npm run dev` - start Vite with HMR.
- `npm run build` - typecheck and build the app.
- `npm run lint` - run ESLint.
- `npm test` - run Vitest tests.

From the repository root, use `npm run dev:web` for just the web app or `npm run dev` for the full local stack.

## Vercel

Set **Root Directory** to `web`. This app imports `../convex/_generated/api`, so `tsc` must resolve Convex backend types from the **repo root** (`../node_modules`). After `npm install` in `web`, the **`postinstall`** script runs `npm install --prefix ..` so root deps (`convex`, `zod`, `@faker-js/faker`, …) exist on CI/Vercel even without custom Install Command. `web/vercel.json` can still set `installCommand` + SPA rewrites.
