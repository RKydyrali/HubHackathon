# JumysAI — Full Project Scope

This document describes the **complete product and engineering scope** of the JumysAI monorepo: what the system is for, what is in and out of scope, how the repo is organized, and how the web app, Convex backend, integrations, and data model fit together.

For a complementary, implementation-oriented technical breakdown (HTTP routes, HH sync rules, AI function list), see [`docs/jumysai-technical-scope.md`](docs/jumysai-technical-scope.md).

---

## 1. Product definition

**JumysAI** is a **hyperlocal hiring platform** focused on **Aktau, Kazakhstan** (and the broader Mangystau context in UX copy). It connects **job seekers**, **employers**, and **admins** in one web product backed by **Convex**, with **AI-assisted** vacancy authoring, screening, matching, and a **conversational job search** experience. Optional **Telegram** linkage provides notifications and a bot integration surface; **HeadHunter (HH)** supplies **read-only imported vacancies** for discovery alongside **native** employer-posted jobs.

### 1.1 Vacancy sources (core domain rule)

| Source   | Meaning |
| -------- | ------- |
| **Native** | Created inside JumysAI by employers; editable; **in-app applications** allowed when published. |
| **HH**     | Imported from HH API for **discovery**; **read-only** in-app; users **apply via external URL** only. |

The product must **always** distinguish these in the UI (apply vs external CTA, labeling).

### 1.2 Strategic goal (current phase)

Ship a **lean, production-shaped vertical slice**: role-based auth, discovery, native vacancy lifecycle, applications with AI screening, embeddings/matching, Telegram notifications, recurring HH ingestion, and **AI job assistant** (chat, criteria extraction, explanations, comparison).

---

## 2. In scope vs out of scope

### 2.1 In scope

- **Web application** for seekers, employers, and admins (React + Vite).
- **Clerk** authentication; Convex resolves identity and **server-side** roles/ownership.
- **Convex** backend: schema, queries, mutations, actions, HTTP actions, cron jobs, vector indexes.
- **OpenRouter**: structured generation, screening analysis, embeddings, AI job assistant prompts.
- **Telegram**: notification delivery and **HTTP contract** for a Railway-hosted bot (bot repo may live outside this monorepo).
- **HH API**: scheduled sync for area **`159`** (Aktau), idempotent upsert, embedding refresh on text change, conservative archival of stale rows.
- **i18n**: Russian and Kazakh (`ru`, `kk`) in the web app.
- **Automated tests** (Vitest) for shared logic and selected UI/helpers (root and `web/`).

### 2.2 Explicitly out of scope (current phase)

- Native **mobile apps**.
- **Payments**, employer **billing**, subscriptions.
- **Resume file parsing** (PDF/DOCX upload parsing).
- Heavy **moderation** or full **analytics warehouse** / BI.
- Orchestration beyond **Convex actions + crons**.
- Telegram bot **implementation** as a requirement of this repo (contract and backend routes are in scope).

---

## 3. Personas and roles

| Role       | Capabilities (summary) |
| ---------- | ---------------------- |
| **Seeker** | Profile, vacancy discovery, native apply flow, applications history, notifications, AI job search, dashboard summary, structured “coach” guidance from profile/applications. |
| **Employer** | Native vacancies (draft/publish/archive), AI-assisted drafting and screening questions, applicant review (scores/summaries advisory), application status workflow, interviews, notifications, dashboard summary. |
| **Admin**    | Cross-cutting read/support: users, vacancies, applications, interviews, notifications, overview. |

**Model:** one **primary role per user** (`seeker` | `employer` | `admin`). Dual seeker+employer is a **future** product change.

---

## 4. Technical stack

| Layer | Technology | Role |
| ----- | ---------- | ---- |
| Frontend | React 19, Vite 8, React Router 6, Tailwind 4, shadcn/Base UI patterns | UI, routing, forms, realtime Convex subscriptions |
| Auth | Clerk (`@clerk/clerk-react`) | Sign-in; JWT for Convex |
| Backend | Convex | Database, business logic, HTTP, crons, vector search |
| AI | OpenRouter | Chat/completions, JSON workflows, embeddings |
| Validation | Zod | Payload and AI output validation |
| Bot hosting (external) | Railway | Telegram runtime (expected) |
| Notifications | Telegram Bot API | Outbound messages |
| External jobs | HH API | Imported vacancies |
| Tooling | TypeScript, ESLint (web), Vitest | Quality and regression checks |

**Monorepo layout:**

- **Root** — Convex backend package (`package.json`, `convex/`, shared tests).
- **`web/`** — Vite SPA (`web/package.json`, `web/src/`).

---

## 5. Repository map (high level)

| Path | Purpose |
| ---- | ------- |
| `convex/` | Schema, queries/mutations/actions, HTTP router, crons, AI and HH helpers |
| `convex/lib/` | Auth, domain rules, OpenRouter, prompts, validators, HH normalization, AI assistant schemas |
| `web/src/features/` | Feature folders: auth, dashboards, vacancies, applications, AI search, admin, etc. |
| `web/src/components/` | Shell, UI primitives, shared widgets |
| `web/src/routing/` | Route guards (`ProtectedRoute`) |
| `tests/` | Root Vitest tests (domain, HH, HTTP, etc.) |
| `docs/` | Additional technical documentation |

---

## 6. Frontend scope

### 6.1 Principles

- **Thin client:** no authoritative business rules; no direct OpenRouter/Telegram/HH calls.
- **Convex-only** trusted API: queries, mutations, actions (as designed per feature).
- **Realtime** where useful: lists and notifications driven by Convex subscriptions.

### 6.2 Routes (current)

**Public**

| Path | Page |
| ---- | ---- |
| `/` | Public home |
| `/ai-search`, `/ai-search/:chatId` | AI job assistant (public entry) |
| `/login/*` | Clerk login |

**Onboarding (authenticated, role may be unset)**

| Path | Page |
| ---- | ---- |
| `/onboarding` | Role selection / onboarding |

**Seeker + admin (shell: seeker)**

| Path | Page |
| ---- | ---- |
| `/dashboard` | Seeker dashboard |
| `/dashboard/ai-search`, `/dashboard/ai-search/:chatId` | AI job assistant (dashboard) |
| `/vacancies` | Vacancy list |
| `/vacancies/:id` | Vacancy detail |
| `/vacancies/:id/apply` | Apply (native only; HH must externalize) |
| `/applications` | Seeker applications |
| `/profile` | Profile editor |
| `/notifications` | Notifications |

**Employer + admin (shell: employer)**

| Path | Page |
| ---- | ---- |
| `/employer/dashboard` | Employer dashboard |
| `/employer/vacancies` | Employer vacancy list |
| `/employer/vacancies/:id` | Employer vacancy detail / editing |
| `/employer/applications` | Applications inbox |
| `/employer/applications/:id` | Application review |
| `/employer/interviews` | Interviews |
| `/employer/notifications` | Notifications |

**Admin only**

| Path | Page |
| ---- | ---- |
| `/admin` | Admin overview |
| `/admin/users` | Users |
| `/admin/vacancies` | Vacancies |
| `/admin/applications` | Applications |
| `/admin/interviews` | Interviews |
| `/admin/notifications` | Notifications |

**Legacy redirects**

- `/jobs` → `/vacancies`; `/jobs/:id` → `/vacancies/:id`
- `/app/seeker/*` and `/app/employer/*` → canonical paths above

### 6.3 Frontend feature expectations

- **Native vs HH:** clear labeling; apply only on native published vacancies; HH opens external apply.
- **AI authoring:** drafts and screening questions are **editable suggestions** before save.
- **Screening:** show `aiScore` / `aiSummary` as **advisory**, not hiring decisions.
- **i18n:** `ru` and `kk` copy via shared locale context and storage key (`jumysai.locale`).

---

## 7. Backend scope (Convex)

### 7.1 Responsibilities

- Identity sync from Clerk → `users`
- **All** authorization (roles, vacancy ownership, application access)
- Native vacancy CRUD lifecycle; **no** public mutation path for HH rows
- Applications, interviews, reviews, notifications (with dedupe and delivery status)
- AI: vacancy/screening/matching/**assistant** orchestration; validated persistence
- HTTP **`/v1/bot/*`** bot routes (shared secret; legacy **`/bot/*`** until Phase C removal); HH sync cron; optional internal scheduling

### 7.2 Primary Convex modules (by file)

| File | Domain |
| ---- | ------ |
| `schema.ts` | Tables and indexes |
| `users.ts` | User upsert, role linkage |
| `profiles.ts` | Seeker profiles, embedding triggers |
| `vacancies.ts` | Native/HH reads and native writes |
| `applications.ts` | Apply, status transitions, screening fields |
| `interviews.ts` | Scheduling and status |
| `reviews.ts` | Post-application ratings |
| `notifications.ts` | Ledger, dedupe, Telegram dispatch |
| `ai.ts` | Vacancy generation, screening, embeddings, matching |
| `aiJobAssistant.ts` | Chat sessions, criteria extraction, discussion, match explanations, compare |
| `coach.ts` | Structured seeker “coach” from profile + applications |
| `dashboards.ts` | Seeker/employer summary stats |
| `admin.ts` | Admin-scoped operations |
| `hhSync.ts` | HH import pipeline |
| `crons.ts` | Scheduled jobs (e.g. HH sync) |
| `http.ts` | HTTP router (bot endpoints) |
| `auth.config.ts` | Clerk JWT issuer configuration |

Shared logic lives under `convex/lib/` (`auth.ts`, `domain.ts`, `validators.ts`, `openrouter.ts`, `prompts.ts`, `hh.ts`, `http.ts`, `aiJobAssistantSchemas.ts`, `aiJobAssistantValidators.ts`, `coach.ts`, `constants.ts`).

### 7.3 Bot HTTP contract (summary)

All bot routes expect **`BOT_SHARED_SECRET`**; the bot does not bypass business rules. Canonical paths are under **`/v1/bot/*`**; **`/bot/*`** remains as a deprecated alias (see `docs/jumysai-technical-scope.md`). Typical routes (see `convex/http.ts` and that doc for the full table):

- User upsert / link by Telegram
- List vacancies with filters
- Submit application to **native** vacancy
- Trigger deduped notification send

---

## 8. Data model (schema overview)

Aligned with `convex/schema.ts`. Embedding dimension is fixed in code (`convex/lib/constants.ts`); changing model/dimension requires **migration planning**.

### 8.1 `users`

- Clerk id, optional **role**, Telegram ids, `isBotLinked`
- Indexes: `by_clerkId`, `by_telegramChatId`

### 8.2 `profiles`

- Seeker profile: name, city, optional **district**, bio, skills, resume text, optional **embedding**
- Indexes: `by_userId`, vector `by_embedding`

### 8.3 `vacancies`

- **Native** or **HH**; `sourceId` stable key for HH; status draft/published/archived
- Title, description, city, optional district, salary fields, screening questions, embedding, `externalApplyUrl`, `lastSyncedAt` (HH)
- Indexes: `by_ownerUserId`, `by_source_sourceId`, `by_status`, `by_source`, vector `by_embedding`

### 8.4 `applications`

- Links seeker ↔ vacancy; status machine; screening answers; optional `aiScore`, `aiSummary`
- Indexes: `by_vacancyId`, `by_seekerUserId`

### 8.5 `notifications`

- Typed notifications, **dedupeKey**, title/body, **deliveryStatus**, `sentAt`, optional **`readAt`**
- Indexes: `by_userId`, `by_dedupeKey`

### 8.6 `reviews`

- Author, target, `applicationId`, rating, optional comment

### 8.7 `interviews`

- Tied to application + vacancy + employer + seeker; schedule, location/link, status
- Indexes: `by_applicationId`, `by_employerUserId`, `by_seekerUserId`

### 8.8 `aiJobChats` / `aiJobChatMessages`

- **AI job assistant** sessions: title, extracted criteria, matched vacancy ids, timestamps
- Messages: role, content, structured **metadata**, `createdAt`
- Indexes: `by_userId_and_updatedAt`, `by_chatId_and_createdAt`

---

## 9. Application and hiring workflow

### 9.1 Application creation

- **Web:** signed-in seekers on **native published** vacancies.
- **Bot:** same validation via HTTP → shared backend logic.

**HH vacancies:** no in-app application; redirect to `externalApplyUrl`.

### 9.2 Screening

- Employers generate **three** job-specific questions (AI-assisted, editable).
- Seekers submit answers with the application.
- Backend runs AI **analysis** → `aiScore`, `aiSummary` (advisory).

### 9.3 Status lifecycle (default)

| Current status | Allowed next |
| -------------- | ------------ |
| `submitted` | `reviewing` |
| `reviewing` | `interview`, `rejected` |
| `interview` | `hired`, `rejected` |
| `rejected`, `hired` | terminal |

Invalid transitions **must** be rejected server-side. Admin may have **recovery** paths for support.

### 9.4 Interviews and reviews

- **Interviews:** schedule, update status, visibility for participants.
- **Reviews:** simple rating/text **after** a real application relationship exists.

---

## 10. AI scope

### 10.1 `ai.ts` (representative capabilities)

- Structured **vacancy** generation from raw text
- **Screening question** generation (3 questions)
- **Embeddings** for profiles and vacancies
- **Screening analysis** (score + summary)
- **Matching**: vacancies for a seeker; seekers for a native vacancy (vector + business filters)

### 10.2 `aiJobAssistant.ts`

- Multi-turn **chat** with persisted history
- **Criteria extraction** and merge; profile-aware search text
- **Match** lists with explanations; optional **compare** vacancies
- Must **validate** model output before persistence; failures should degrade gracefully (e.g. partial UI, empty matches) without breaking core CRUD

### 10.3 Design rules

- Model names configurable via environment
- Prompts isolated from low-level DB patches
- Fixed embedding dimension for the deployment
- AI failures **must not** block basic non-AI flows

---

## 11. Notifications

- Types include (per validators): e.g. new application, status change, strong match, custom
- **Dedupe** keys prevent spam
- Missing Telegram chat → record **skipped**; send failure → **failed** without rolling back primary business write
- Frontend reads **Convex state**; do not assume Telegram is the only future channel

---

## 12. HH synchronization

- Target **area 159**; paginated fetch; normalize to shared vacancy shape
- Upsert on `(source="hh", sourceId)`
- Refresh embeddings when searchable text changes
- After **successful** full sync, archive stale HH rows; **do not** hard-delete
- HH rows remain **visually and behaviorally** external for apply

---

## 13. Security and configuration

### 13.1 Environment variables (see `.env.example`)

| Variable | Purpose |
| -------- | ------- |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk issuer for Convex auth |
| `VITE_CONVEX_URL` | Web client URL in `web/.env.local` (`.convex.cloud`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend publishable key in `web/.env.local` |
| `CONVEX_SITE_URL` | Convex HTTP site URL for the bot (`.convex.site`) |
| `BOT_SHARED_SECRET` | Bot HTTP authentication |
| `OPENROUTER_API_KEY` | AI provider key |
| `OPENROUTER_BASE_URL` | API base URL |
| `OPENROUTER_CHAT_MODEL` | Default structured/chat model |
| `OPENROUTER_COMPLEX_MODEL` | Heavier reasoning model |
| `OPENROUTER_EMBEDDING_MODEL` | Embedding model id |
| `TELEGRAM_BOT_TOKEN` | Telegram API token |

### 13.2 Authorization stance

- **Every** sensitive Convex function validates user and role/ownership via shared helpers (`convex/lib/auth.ts`).
- UI hiding controls is **not** security; server is source of truth.

---

## 14. Testing and verification

**Typical commands** (from repo root):

```bash
npx convex codegen --typecheck disable
npm run typecheck
npm test
```

**Web package** (`web/`): `npm run test`, `npm run lint`, `npm run build` as needed.

Root tests include domain rules, HH normalization, HTTP secret behavior, etc. (see `tests/`). Web tests cover selected components and libs under `web/src/**/*.test.*`.

---

## 15. Definition of done (this phase)

The phase is successful when:

1. **Web:** Clerk auth, onboarding, role-appropriate shells and routes work end-to-end.
2. **Seekers:** profile, discovery (native + HH), native apply, applications, notifications, AI assistant, dashboard/coach.
3. **Employers:** native vacancy lifecycle, AI assist, applicants, screening display, status workflow, interviews, notifications, dashboard.
4. **Admins:** support surfaces for users, vacancies, applications, interviews, notifications.
5. **Data:** HH sync runs on schedule, idempotent and conservative; embeddings consistent with filters.
6. **AI:** vacancy, screening, matching, and assistant flows return **validated** results; graceful degradation without breaking CRUD.
7. **Telegram:** notifications deduped and non-blocking relative to core writes.

---

## 16. Related documentation

- [`docs/jumysai-technical-scope.md`](docs/jumysai-technical-scope.md) — deep technical scope (HTTP tables, dedupe, HH details, file pointers).
- [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) — Convex agent notes; read `convex/_generated/ai/guidelines.md` before Convex changes.

---

*Document generated to reflect the repository structure and schema as of the last update; if behavior drifts, prefer `convex/schema.ts`, `web/src/App.tsx`, and the technical scope doc as the source of truth.*
