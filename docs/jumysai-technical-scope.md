---
title: JumysAI Technical Scope
description: Full project technical scope for the JumysAI web app, Convex backend, Telegram bot integration, AI layer, and operational boundaries.
---

# JumysAI Technical Scope

## Project Definition

JumysAI is a hyperlocal hiring platform for Aktau, Kazakhstan. The product combines a web application for employers and job seekers, a Convex backend that owns business logic and realtime data, AI-assisted vacancy and matching workflows through OpenRouter, and a Railway-hosted Telegram bot that uses the same backend through strict HTTP actions.

The system is designed around two vacancy types:

- native vacancies are created inside JumysAI, owned by employers, editable in the product, and open to in-app applications
- HH vacancies are imported from HH for discovery only, are read-only inside JumysAI, and always direct users to an external apply URL

The goal of the current phase is to ship a lean but production-shaped vertical slice: role-based auth, job discovery, native vacancy management, in-app applications, AI parsing and matching, Telegram notifications, and recurring HH ingestion.

## System Scope

The current project scope includes:

- a web frontend for seekers, employers, and admins
- Clerk-based frontend authentication
- a Convex backend with schema, queries, mutations, actions, HTTP actions, and cron jobs
- an AI layer for vacancy parsing, screening, embeddings, and matching
- a Railway Telegram bot integration through `/bot/*`
- Telegram notification delivery for key hiring events
- HH vacancy import for Aktau discovery inventory

The current project scope does not include:

- a native mobile app
- payment processing
- employer billing or subscription management
- resume file parsing from uploaded PDFs or DOCX files
- moderation dashboards beyond basic admin access patterns
- a dedicated analytics warehouse or BI layer
- advanced workflow orchestration outside Convex actions and cron jobs

## Technical Stack

| Area | Technology | Responsibility |
| --- | --- | --- |
| Web auth | Clerk | User sign-in, session, role initialization entrypoint |
| Backend and database | Convex | Database, business logic, realtime APIs, HTTP actions, cron jobs, vector search |
| AI provider | OpenRouter | Structured generation, screening analysis, embeddings |
| Validation | Zod | HTTP payload validation and AI response validation |
| Bot hosting | Railway | Telegram bot runtime |
| Notifications | Telegram Bot API | Outbound user messages |
| External discovery data | HH API | Vacancy ingestion for area `159` |
| Language | TypeScript | Shared implementation language |
| Tests | Vitest | Business-rule and helper verification |

Current runtime dependencies are defined in [package.json](/C:/Users/ramat/Documents/hackathon/package.json), and environment configuration is sketched in [.env.example](/C:/Users/ramat/Documents/hackathon/.env.example).

## High-Level Architecture

### Components

The system is composed of four primary runtime components:

1. The web frontend used by seekers, employers, and admins.
2. The Convex backend, which acts as the application core and database.
3. The Railway Telegram bot, which exposes a messaging entrypoint for Telegram users.
4. External services: Clerk, OpenRouter, Telegram Bot API, and HH API.

### Responsibility split

The web frontend is responsible for rendering UI, collecting input, maintaining session state through Clerk, and calling Convex functions. It should remain thin and should not contain authoritative business rules.

The Convex backend is responsible for:

- all trusted business logic
- server-side ownership and role checks
- data persistence
- AI orchestration
- vector search and matching
- HTTP actions for the bot
- cron-based HH synchronization
- notification deduping and delivery state tracking

The Railway bot is responsible for:

- Telegram conversation handling
- mapping chat flows into calls to `/bot/*`
- formatting Telegram-native replies for discovery and application flows

### Source-of-truth model

| Domain | Source of truth |
| --- | --- |
| Signed-in web identity | Clerk session resolved in Convex via `ctx.auth.getUserIdentity()` |
| User role and Telegram linkage | Convex `users` table |
| Seeker profile and matching text | Convex `profiles` table |
| Native vacancy state | Convex `vacancies` rows with `source="native"` |
| Imported HH vacancy state | HH API mirrored into Convex `vacancies` rows with `source="hh"` |
| Application lifecycle | Convex `applications` table |
| Interview and review lifecycle | Convex `interviews` and `reviews` tables |
| Notification dedupe and send ledger | Convex `notifications` table |

## Frontend Scope

The frontend scope is the public web application that consumes Clerk for authentication and Convex for app data. The frontend should not duplicate backend authorization logic. It should treat Convex as the only trusted application API.

### Frontend responsibilities

The frontend is in scope for:

- authentication entry and role-aware onboarding
- seeker profile creation and editing
- employer vacancy creation and management
- public vacancy discovery
- native vacancy application submission
- employer review of applications and screening output
- interview scheduling and tracking UI
- notification display from Convex state
- clear separation between native and HH vacancy behavior

The frontend is not responsible for:

- making direct calls to OpenRouter
- computing match scores client-side
- enforcing ownership or role checks
- sending Telegram messages directly
- ingesting HH data directly

### Frontend user roles

#### Seeker scope

Seeker-facing frontend features should include:

- sign-in and role sync
- profile editor for full name, city, district if used by UI, bio, skills, and resume text
- public vacancy feed and filtered search
- vacancy detail pages showing whether a job is native or HH
- in-app apply flow for native vacancies only
- redirect or external CTA for HH vacancies
- personal application history
- status visibility for submitted applications
- interview details when an application moves into interview
- received notifications and match prompts

#### Employer scope

Employer-facing frontend features should include:

- sign-in and role sync
- vacancy creation, editing, publishing, and archiving
- AI-assisted vacancy drafting from raw text
- generation and editing of screening questions
- employer dashboard for owned vacancies
- applicant list per vacancy
- screening score and summary display
- application status management through the allowed state machine
- interview scheduling and update views
- ability to review candidates after real application context exists

#### Admin scope

Admin-facing scope is intentionally narrow in the current phase:

- ability to read cross-role data through admin-authorized flows
- admin recovery path for application state correction
- manual support and debugging access patterns

### Frontend information architecture

The frontend should include at minimum the following page and feature groups:

| Surface | Audience | Purpose |
| --- | --- | --- |
| Landing / discovery | Public and signed-in users | Browse jobs and explain the platform |
| Auth / onboarding | New users | Sign in and establish role |
| Seeker profile | Seeker | Manage profile data used for matching |
| Vacancy detail | Public and signed-in users | View vacancy content and apply behavior |
| Employer vacancy dashboard | Employer | Manage native vacancies |
| Employer vacancy editor | Employer | Create or update native vacancies |
| Employer applicants view | Employer | Review applications and AI outputs |
| Seeker applications view | Seeker | Track personal applications |
| Interviews view | Seeker and employer | See interview schedule and status |
| Notifications view | Signed-in users | Read backend-generated app events |

### Frontend behavior requirements

The frontend must render vacancy source clearly:

- native vacancies should show in-app apply controls
- HH vacancies should show that they are external discovery items and must use the external apply CTA

The frontend should handle AI-assisted authoring carefully:

- AI-generated vacancy drafts should be treated as editable suggestions before save
- screening question generation should prefill the employer editor but remain editable
- screening analysis results should display as advisory scoring, not final hiring decisions

The frontend should be realtime-aware where useful:

- employer applicant views should update as applications arrive
- seeker application history should reflect status changes without manual refresh when possible
- notifications should display based on Convex state rather than assuming Telegram delivery succeeded

### Frontend integration contract

The frontend should consume:

- Clerk for auth and session
- Convex queries for reads
- Convex mutations for user-driven writes
- Convex actions for AI-triggering operations

The frontend must not call bot HTTP actions or external provider APIs directly.

## Backend Scope

The backend is implemented in the `convex/` directory and is the trusted application core.

### Backend responsibilities

The Convex backend is responsible for:

- schema definition and indexing
- user identity synchronization from Clerk
- role and ownership checks
- native vacancy lifecycle management
- seeker application lifecycle management
- AI-assisted content generation and matching
- notification dedupe and Telegram delivery
- bot-facing HTTP routes
- HH import scheduling and idempotent sync

### Backend file structure

Primary files:

- [convex/schema.ts](/C:/Users/ramat/Documents/hackathon/convex/schema.ts)
- [convex/users.ts](/C:/Users/ramat/Documents/hackathon/convex/users.ts)
- [convex/profiles.ts](/C:/Users/ramat/Documents/hackathon/convex/profiles.ts)
- [convex/vacancies.ts](/C:/Users/ramat/Documents/hackathon/convex/vacancies.ts)
- [convex/applications.ts](/C:/Users/ramat/Documents/hackathon/convex/applications.ts)
- [convex/reviews.ts](/C:/Users/ramat/Documents/hackathon/convex/reviews.ts)
- [convex/interviews.ts](/C:/Users/ramat/Documents/hackathon/convex/interviews.ts)
- [convex/ai.ts](/C:/Users/ramat/Documents/hackathon/convex/ai.ts)
- [convex/notifications.ts](/C:/Users/ramat/Documents/hackathon/convex/notifications.ts)
- [convex/http.ts](/C:/Users/ramat/Documents/hackathon/convex/http.ts)
- [convex/hhSync.ts](/C:/Users/ramat/Documents/hackathon/convex/hhSync.ts)
- [convex/crons.ts](/C:/Users/ramat/Documents/hackathon/convex/crons.ts)

Shared helper modules:

- [convex/lib/auth.ts](/C:/Users/ramat/Documents/hackathon/convex/lib/auth.ts)
- [convex/lib/domain.ts](/C:/Users/ramat/Documents/hackathon/convex/lib/domain.ts)
- [convex/lib/http.ts](/C:/Users/ramat/Documents/hackathon/convex/lib/http.ts)
- [convex/lib/hh.ts](/C:/Users/ramat/Documents/hackathon/convex/lib/hh.ts)
- [convex/lib/openrouter.ts](/C:/Users/ramat/Documents/hackathon/convex/lib/openrouter.ts)
- [convex/lib/prompts.ts](/C:/Users/ramat/Documents/hackathon/convex/lib/prompts.ts)
- [convex/lib/validators.ts](/C:/Users/ramat/Documents/hackathon/convex/lib/validators.ts)

## Data Model

The schema is intentionally lean and keeps embeddings only on profiles and vacancies.

### `users`

Purpose: canonical application identity, role, and Telegram linkage.

| Field | Type | Meaning |
| --- | --- | --- |
| `clerkId` | `string` | Clerk subject or a temporary Telegram placeholder id |
| `role` | `seeker \| employer \| admin` | Primary product role |
| `telegramChatId` | optional `string` | Telegram delivery address |
| `telegramUsername` | optional `string` | Human-readable Telegram identifier |
| `isBotLinked` | `boolean` | Whether Telegram linkage exists |

Indexes:

- `by_clerkId`
- `by_telegramChatId`

### `profiles`

Purpose: seeker profile and search/matching surface.

| Field | Type | Meaning |
| --- | --- | --- |
| `userId` | `Id<"users">` | Owner |
| `fullName` | `string` | Seeker display name |
| `city` | `string` | Primary city |
| `bio` | optional `string` | Profile summary |
| `skills` | `string[]` | Skills list |
| `resumeText` | optional `string` | Matching text |
| `embedding` | optional `float64[]` | Vector used for matching |

The current API layer also references `district` in profile mutation flows. The intended product scope includes district-level filtering, and the schema should stay aligned with that field wherever the backend keeps it.

Indexes:

- `by_userId`
- vector index `by_embedding`

### `vacancies`

Purpose: native and HH vacancies in a shared table.

| Field | Type | Meaning |
| --- | --- | --- |
| `ownerUserId` | optional `Id<"users">` | Employer owner for native vacancies |
| `source` | `native \| hh` | Vacancy origin |
| `sourceId` | `string` | Stable external id for HH records |
| `status` | `draft \| published \| archived` | Publish state |
| `title` | `string` | Job title |
| `description` | `string` | Main searchable content |
| `city` | `string` | City |
| `salaryMin` | optional `number` | Lower bound |
| `salaryMax` | optional `number` | Upper bound |
| `salaryCurrency` | optional `string` | Currency |
| `screeningQuestions` | optional `string[]` | Employer-defined screening prompts |
| `embedding` | optional `float64[]` | Vector used for matching |
| `externalApplyUrl` | optional `string` | HH apply destination |
| `lastSyncedAt` | optional `number` | HH sync timestamp |

The current API layer also uses district-level arguments and filtering for vacancies. District is therefore part of the effective product scope and should be kept consistent across the schema and frontend filtering model.

Indexes:

- `by_ownerUserId`
- `by_source_sourceId`
- `by_status`
- `by_source`
- vector index `by_embedding`

### `applications`

Purpose: native in-app applications and screening results.

| Field | Type | Meaning |
| --- | --- | --- |
| `vacancyId` | `Id<"vacancies">` | Target vacancy |
| `seekerUserId` | `Id<"users">` | Applicant |
| `status` | `submitted \| reviewing \| interview \| rejected \| hired` | Application state |
| `screeningAnswers` | optional array | Candidate answers |
| `aiScore` | optional `number` | Screening score |
| `aiSummary` | optional `string` | Screening summary |

Indexes:

- `by_vacancyId`
- `by_seekerUserId`

### `notifications`

Purpose: notification ledger and dedupe state.

| Field | Type | Meaning |
| --- | --- | --- |
| `userId` | `Id<"users">` | Recipient |
| `type` | `new_application \| status_change \| strong_match \| custom` | Event class |
| `dedupeKey` | `string` | Deterministic spam guard |
| `title` | `string` | Message heading |
| `body` | `string` | Message content |
| `deliveryStatus` | `queued \| sent \| failed \| skipped` | Delivery state |
| `sentAt` | optional `number` | Delivery timestamp |

Indexes:

- `by_userId`
- `by_dedupeKey`

### `reviews`

Purpose: lightweight rating and comment records tied to a real application relationship.

| Field | Type |
| --- | --- |
| `authorUserId` | `Id<"users">` |
| `targetUserId` | `Id<"users">` |
| `applicationId` | `Id<"applications">` |
| `rating` | `number` |
| `comment` | optional `string` |

### `interviews`

Purpose: interview scheduling and status tracking.

| Field | Type |
| --- | --- |
| `applicationId` | `Id<"applications">` |
| `vacancyId` | `Id<"vacancies">` |
| `employerUserId` | `Id<"users">` |
| `seekerUserId` | `Id<"users">` |
| `scheduledAt` | `number` |
| `locationOrLink` | optional `string` |
| `status` | `scheduled \| completed \| cancelled` |

Index:

- `by_applicationId`

## Auth and Authorization Scope

### Clerk scope

Clerk is the only frontend auth provider in scope. The website should use Clerk for sign-in and pass authenticated requests into Convex. The backend then resolves the Clerk subject into a `users` row and applies role and ownership checks.

### Role model

The current role model is single-role-per-user:

- `seeker`
- `employer`
- `admin`

If a user must support both employer and seeker behavior later, that is a future model change rather than part of the current scope.

### Authorization rules

The backend must enforce these rules server-side in reusable helpers:

- only employers and admins can create or mutate native vacancies
- only the owner employer or an admin can edit, publish, or archive a native vacancy
- HH vacancies are never editable through public app or bot flows
- only seekers and admins can create seeker profiles and applications
- applications can only be created on native published vacancies
- only employers who own the vacancy or admins can review its applications
- only valid counterparties can create reviews
- only valid participants can read interview state

The frontend may hide actions based on role, but hidden UI is not considered authorization.

## Vacancy Domain Scope

### Native vacancies

Native vacancy scope includes:

- create
- edit
- publish
- archive
- AI-assisted draft generation
- AI-assisted screening question generation
- employer-owned applicant review
- seeker applications inside JumysAI
- matching against seeker profiles

### HH vacancies

HH vacancy scope includes:

- sync from HH every 30 minutes
- public discovery in the web app
- optional appearance in Telegram discovery flows
- matching visibility for seekers
- external redirect or external apply CTA

HH vacancy scope excludes:

- in-app editing
- in-app applications
- employer ownership inside JumysAI

## Application and Hiring Flow Scope

### Application creation

Applications can be created:

- by signed-in seekers from the web app
- by the Telegram bot through `/bot/applications`

In both cases, the backend uses shared internal logic so the validation rules are identical.

### Screening

The screening flow includes:

- employers generating three job-specific screening questions for native vacancies
- seekers submitting answers with the application
- backend AI scoring and summarization
- display of `aiScore` and `aiSummary` to employers as advisory outputs

### Status lifecycle

Default application transitions are:

| From | Allowed next states |
| --- | --- |
| `submitted` | `reviewing` |
| `reviewing` | `interview`, `rejected` |
| `interview` | `hired`, `rejected` |
| `rejected` | none |
| `hired` | none |

Invalid jumps must be rejected. An admin-only recovery path exists for exceptional repair and support use.

### Interviews and reviews

Interview scope includes scheduling, status updates, and participant visibility. Review scope includes simple rating and optional text after a real application relationship exists.

## AI Scope

The AI layer is implemented in [convex/ai.ts](/C:/Users/ramat/Documents/hackathon/convex/ai.ts) and helper modules under `convex/lib/`.

### AI features in scope

| Function | Purpose |
| --- | --- |
| `generateVacancy` | Convert raw employer text into structured vacancy fields |
| `generateScreeningQuestions` | Generate exactly 3 role-specific screening questions |
| `generateEmbedding` | Produce a fixed-dimension embedding vector |
| `analyzeScreening` | Score and summarize candidate answers |
| `getMatchingVacancies` | Rank vacancies for a seeker profile |
| `getMatchingSeekers` | Rank seekers for a native vacancy |

### AI design rules

- all OpenRouter responses must be validated before persistence
- prompts must stay isolated from mutations
- model names must be easy to swap through environment configuration
- embedding dimension remains fixed for the current deployment
- AI failure must not break core CRUD behavior
- missing embeddings must return empty match results rather than errors

### Embeddings and vector search

Embeddings are stored only on:

- `profiles`
- `vacancies`

Convex vector search is used for relevance ranking. After ranking, backend business filters still apply so the final result set respects source and visibility rules.

## Telegram Bot Scope

The Telegram bot itself is out of repo scope today, but its contract with the backend is in scope.

### Bot goals

The bot should be able to:

- upsert or link a user by Telegram chat id
- fetch public vacancies
- submit an application to a native vacancy
- trigger a notification send through the backend

### HTTP contract

The backend exposes these routes in [convex/http.ts](/C:/Users/ramat/Documents/hackathon/convex/http.ts):

| Route | Method | Purpose |
| --- | --- | --- |
| `/bot/users/upsert` | `POST` | Create or link a Telegram-facing user record |
| `/bot/vacancies` | `GET`, `POST` | Fetch public vacancies with simple filtering |
| `/bot/applications` | `POST` | Submit a native vacancy application |
| `/bot/notifications/send` | `POST` | Dispatch a deduped Telegram notification |

### Bot security

All bot routes require a shared secret. The bot is not a privileged superuser and does not bypass core business checks.

## Notification Scope

Notification behavior is implemented in [convex/notifications.ts](/C:/Users/ramat/Documents/hackathon/convex/notifications.ts).

### Events in scope

- new application to employer
- application status change to seeker
- strong vacancy match to seeker
- strong seeker match to employer for native vacancies

### Delivery rules

- notifications are deduped by deterministic keys
- duplicate event/entity pairs should not spam users
- if Telegram chat id is missing, store `skipped` and continue
- if Telegram delivery fails, store `failed` and do not roll back the main mutation

The frontend should read notification state from Convex and should not assume that Telegram delivery is the only channel a user will ever have.

## HH Sync Scope

HH sync behavior is implemented in [convex/hhSync.ts](/C:/Users/ramat/Documents/hackathon/convex/hhSync.ts) and scheduled in [convex/crons.ts](/C:/Users/ramat/Documents/hackathon/convex/crons.ts).

### Sync behavior

The sync must:

- fetch HH vacancies for `area=159`
- paginate through all pages
- normalize incoming payloads into the JumysAI vacancy shape
- upsert by `source="hh"` plus `sourceId`
- update only changed records
- refresh embeddings only when matching text changed
- archive stale HH vacancies only after a complete successful sync
- never delete HH vacancies

### Frontend impact

HH records should appear in discovery surfaces alongside native vacancies, but must always remain visually distinct and externally applyable only.

## Configuration Scope

Expected environment variables:

| Variable | Purpose |
| --- | --- |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk issuer for Convex auth config |
| `BOT_SHARED_SECRET` | Shared secret for bot HTTP actions |
| `OPENROUTER_API_KEY` | OpenRouter credential |
| `OPENROUTER_BASE_URL` | OpenRouter base URL |
| `OPENROUTER_CHAT_MODEL` | Fast/default structured generation model |
| `OPENROUTER_COMPLEX_MODEL` | More capable model for complex analysis |
| `OPENROUTER_EMBEDDING_MODEL` | Embedding model name |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token |

> [!IMPORTANT]
> The embedding model name is configurable, but the embedding dimension is intentionally fixed in code and schema for the current deployment. Moving to a different vector size requires schema and data migration work.

## Testing and Verification Scope

Automated coverage currently exists for core helper behavior in:

- [tests/domain.test.ts](/C:/Users/ramat/Documents/hackathon/tests/domain.test.ts)
- [tests/hh.test.ts](/C:/Users/ramat/Documents/hackathon/tests/hh.test.ts)
- [tests/http.test.ts](/C:/Users/ramat/Documents/hackathon/tests/http.test.ts)

Current verified areas include:

- strict application transitions
- native versus HH application rules
- deterministic notification dedupe keys
- match score normalization
- HH normalization and change detection
- bot shared-secret validation

Recommended verification commands:

```bash title="verification commands"
npx convex codegen --typecheck disable
npm run typecheck
npm test
```

## Delivery Boundaries for This Phase

This phase should be considered complete when:

- the web frontend can authenticate users and render role-appropriate flows
- seekers can build profiles and apply to native vacancies
- employers can create native vacancies, publish them, and process applications
- public discovery shows both native and HH jobs with correct behavior
- AI-assisted vacancy generation, screening, and matching are working behind validated backend calls
- Telegram notifications are deduped and non-blocking
- HH sync is recurring, idempotent, and conservative

The phase should not be expanded to include unrelated product surfaces such as billing, deep analytics, mobile apps, or broad moderation tooling until this hiring core is stable.
