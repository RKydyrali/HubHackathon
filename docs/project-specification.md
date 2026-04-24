---
title: JumysAI Project Specification
description: Complete product and technical specification for the JumysAI hiring platform.
---

# JumysAI Project Specification

Generated from the repository state on April 24, 2026.

## 1. Project Summary

JumysAI is a hyperlocal hiring platform for Aktau, Kazakhstan. It connects job seekers with local employers through a web application, a Convex backend, AI-assisted job discovery and screening, imported HH vacancies, Telegram notifications, and a bot-facing HTTP contract.

The product supports two vacancy sources:

| Source | Description | Apply behavior |
| --- | --- | --- |
| `native` | Vacancy created inside JumysAI by an employer or admin. | Users apply inside JumysAI. |
| `hh` | Vacancy imported from HH for discovery. | Users are sent to the external HH apply URL. |

Convex is the authoritative application backend. The frontend is a React/Vite client that renders role-specific workflows and calls Convex through typed generated APIs. External services are Clerk for authentication, OpenRouter for structured generation and embeddings, Telegram Bot API for notification delivery, and HH API for vacancy ingestion.

## 2. Goals

The current project should deliver a complete vertical slice for local hiring:

- Let seekers sign in, choose a role, complete a profile, search vacancies, use AI-assisted discovery, apply to native vacancies, track applications, and receive notifications.
- Let employers sign in, choose a role, create native vacancies, use AI-assisted vacancy drafting and screening, publish jobs, review applicants, advance applications, schedule interviews, and receive notifications.
- Let admins inspect users, vacancies, applications, interviews, and notifications through paginated administrative views.
- Import HH vacancies for Aktau and keep them visible as read-only discovery inventory.
- Keep business rules and authorization on the backend.
- Use AI as an assistant layer without making core CRUD and hiring flows dependent on successful AI calls.

## 3. Non-Goals

The following are outside the current project scope:

- Native mobile apps.
- Payments, subscriptions, or employer billing.
- Resume file parsing from PDF, DOCX, or image uploads.
- Full moderation tooling beyond admin read and recovery flows.
- A dedicated analytics warehouse.
- Multi-tenant employer organizations.
- Multi-role user accounts beyond the current single selected role model.
- Direct frontend access to OpenRouter, Telegram Bot API, or HH API.

## 4. User Roles

### 4.1 Seeker

A seeker is a signed-in user looking for local work. The seeker can:

- Choose the `seeker` role during onboarding.
- Create and update a profile with name, city, district, bio, skills, and resume text.
- Browse public vacancies.
- Use the AI job assistant to express job preferences conversationally.
- Apply to published native vacancies.
- Answer screening questions during application.
- Track submitted applications.
- Read interview and notification state.
- Receive strong-match notifications when their profile matches a vacancy.

### 4.2 Employer

An employer is a signed-in user publishing and managing native vacancies. The employer can:

- Choose the `employer` role during onboarding.
- Create draft native vacancies.
- Use AI to convert raw job text into structured vacancy fields.
- Generate three screening questions for a vacancy.
- Update, publish, and archive owned native vacancies.
- Review applications for owned vacancies.
- See applicant profile data and AI screening summaries.
- Advance applications through the allowed hiring state machine.
- Schedule and update interviews after an application reaches `interview`.
- Receive new application and strong seeker match notifications.

### 4.3 Admin

An admin has privileged cross-system visibility and support capabilities. The admin can:

- Read paginated administrative tables for users, vacancies, applications, interviews, and notifications.
- Access seeker and employer protected areas.
- Recover application status directly when support intervention is needed.
- Bypass ownership checks where backend helpers explicitly allow admin access.

Admins cannot self-select the admin role through onboarding.

## 5. Product Surfaces

### 5.1 Public Web

The public web surface includes:

- Home page at `/`.
- AI search entry at `/ai-search`.
- Public vacancy discovery through `/vacancies` after seeker/admin authentication.
- Legacy redirects from `/jobs` and old `/app/*` routes to current routes.

### 5.2 Auth and Onboarding

Authentication is handled by Clerk. The frontend uses `ConvexProviderWithAuth` and a Clerk JWT template, then synchronizes the user row in Convex.

Requirements:

- If required frontend environment variables are missing, the app must show a setup screen instead of mounting Clerk with placeholder keys.
- Signed-out users must redirect to `/login`.
- Signed-in users without a role must redirect to `/onboarding`.
- Onboarding role selection must allow only `seeker` or `employer`.
- Existing role assignments must not be overwritten by normal onboarding.

### 5.3 Seeker Web App

Current seeker routes:

| Route | Purpose |
| --- | --- |
| `/dashboard` | Seeker summary, profile/application state, coaching prompts. |
| `/vacancies` | Vacancy list and filters. |
| `/vacancies/:id` | Vacancy detail. |
| `/vacancies/:id/apply` | Native vacancy application flow. |
| `/applications` | Seeker application history. |
| `/profile` | Profile editor. |
| `/notifications` | Notification timeline. |

Seeker requirements:

- Vacancy source must be visible.
- HH vacancies must not expose in-app application controls.
- Native vacancies must expose an apply flow only when published.
- Profile updates must schedule embedding refresh.
- Application submission must prevent duplicate applications for the same vacancy.
- Screening answers should trigger asynchronous AI analysis when provided.

### 5.4 Employer Web App

Current employer routes:

| Route | Purpose |
| --- | --- |
| `/employer/dashboard` | Employer summary. |
| `/employer/vacancies` | Owned vacancy list and creation/editing entry. |
| `/employer/vacancies/:id` | Owned vacancy detail. |
| `/employer/applications` | Applications across owned vacancies. |
| `/employer/applications/:id` | Application review detail. |
| `/employer/interviews` | Employer interview list. |
| `/employer/notifications` | Notification timeline. |

Employer requirements:

- Only owners and admins may edit native vacancies.
- HH vacancies are read-only and must never become employer-owned by normal flows.
- AI-generated vacancy drafts and screening questions are suggestions and remain editable before persistence.
- Application status changes must use the backend state machine.
- Interview scheduling requires the application to already be in `interview` status.

### 5.5 Admin Web App

Current admin routes:

| Route | Purpose |
| --- | --- |
| `/admin` | Admin overview. |
| `/admin/users` | Paginated users. |
| `/admin/vacancies` | Paginated vacancies. |
| `/admin/applications` | Paginated applications. |
| `/admin/interviews` | Paginated interviews. |
| `/admin/notifications` | Paginated notifications. |

Admin views are read-oriented operational tools, with application status recovery exposed through backend functionality.

### 5.6 AI Job Assistant

The AI job assistant is available at:

- `/ai-search`
- `/ai-search/:chatId`

It supports:

- Conversational search criteria extraction.
- Saved chat history for authenticated seekers and admins.
- Criteria editing through a structured panel.
- Match grouping into best, nearby, fast-start, HH, and all results.
- Fallback matching when AI or embeddings are unavailable.
- Comparing up to three vacancies.
- Follow-up discussion about matched vacancies.

Assistant criteria fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `roles` | `string[]` | Desired roles or job titles. |
| `skills` | `string[]` | Candidate skills. |
| `city` | `string | null` | Desired city. |
| `district` | `string | null` | Local district preference. |
| `schedule` | `string | null` | Preferred working schedule. |
| `workType` | `full_time | part_time | temporary | null` | Type of work. |
| `experienceLevel` | `none | junior | experienced | null` | Candidate experience signal. |
| `salaryMin` | `number | null` | Minimum salary expectation. |
| `urgency` | `today | this_week | flexible | null` | Start urgency. |
| `sourcePreference` | `native | hh | any` | Preferred vacancy source. |

## 6. Architecture

### 6.1 Runtime Components

| Component | Location | Responsibility |
| --- | --- | --- |
| Web app | `web/` | React UI, routing, Clerk auth, Convex client calls. |
| Convex backend | `convex/` | Database, business logic, authorization, AI orchestration, HTTP actions, cron jobs. |
| Telegram bot | External Railway service | Telegram conversation runtime that calls Convex HTTP actions. |
| Clerk | External service | Web identity provider and JWT issuer. |
| OpenRouter | External service | Structured JSON generation and embeddings. |
| Telegram Bot API | External service | Message delivery. |
| HH API | External service | Imported vacancy discovery source. |

### 6.2 Trust Boundaries

The Convex backend is the trust boundary for all application data and business decisions.

The frontend may hide controls based on role, but those checks are only UX affordances. Convex functions must enforce:

- authentication
- role access
- vacancy ownership
- application transition validity
- native versus HH behavior
- notification deduplication
- interview participant access

The Telegram bot uses HTTP actions protected by a shared secret. It is not a superuser and does not bypass core application rules.

### 6.3 Data Flow Summary

1. A user signs in through Clerk.
2. The frontend requests a Convex auth token using the configured Clerk JWT template.
3. Protected routes call `users.syncCurrentUser` when the Convex user row does not exist.
4. The user chooses a role through onboarding if needed.
5. Seeker and employer flows call Convex queries, mutations, and actions.
6. Mutations schedule asynchronous AI and notification actions when needed.
7. Cron jobs periodically import HH vacancies.
8. Bot HTTP routes call shared Convex internal functions for Telegram-specific flows.

## 7. Technology Stack

| Area | Technology |
| --- | --- |
| Backend | Convex 1.36 |
| Backend language | TypeScript |
| Web app | React 19, Vite 8 |
| Routing | React Router 6 |
| Auth | Clerk React, Convex auth integration |
| UI foundation | Tailwind CSS 4, shadcn-style components, Base UI, Phosphor icons |
| Forms and validation | React Hook Form, Zod |
| AI provider | OpenRouter |
| Notifications | Telegram Bot API |
| Tests | Vitest, Testing Library, jsdom |

## 8. Repository Structure

| Path | Purpose |
| --- | --- |
| `convex/schema.ts` | Convex schema and indexes. |
| `convex/users.ts` | User sync, role selection, bot user linking. |
| `convex/profiles.ts` | Seeker profile CRUD and profile embedding refresh scheduling. |
| `convex/vacancies.ts` | Native vacancy CRUD, public listing, HH upsert/archive internals. |
| `convex/applications.ts` | Application creation, listing, status transitions, screening save. |
| `convex/ai.ts` | Vacancy generation, screening, embeddings, vector matching. |
| `convex/aiJobAssistant.ts` | Conversational job search assistant actions and chat persistence. |
| `convex/notifications.ts` | Notification ledger, dedupe, Telegram delivery. |
| `convex/http.ts` | Bot HTTP endpoints. |
| `convex/hhSync.ts` | HH vacancy sync action. |
| `convex/crons.ts` | Scheduled HH sync. |
| `convex/lib/` | Shared domain, auth, prompt, validation, OpenRouter, HH, and assistant helpers. |
| `web/src/App.tsx` | Frontend route map. |
| `web/src/main.tsx` | Clerk and Convex provider setup. |
| `web/src/features/` | Feature pages for public, auth, dashboards, vacancies, applications, admin, profile, notifications, interviews, and AI search. |
| `web/src/components/` | Shared UI, shell, layout, feedback, selector, and skeleton components. |
| `tests/` | Backend/domain Vitest coverage. |
| `web/src/**/*.test.*` | Frontend unit and component tests. |
| `docs/` | Project documentation. |

## 9. Data Model

### 9.1 `users`

Canonical application identity and role record.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `clerkId` | `string` | yes | Uses Clerk token identifier when available. Telegram-only users use `telegram:<chatId>`. |
| `role` | `seeker | employer | admin` | no | Normal onboarding can select only seeker or employer. |
| `telegramChatId` | `string` | no | Used for Telegram delivery and bot lookup. |
| `telegramUsername` | `string` | no | Display metadata from Telegram. |
| `isBotLinked` | `boolean` | yes | True when Telegram linkage exists. |

Indexes:

- `by_clerkId`
- `by_telegramChatId`

### 9.2 `profiles`

Seeker profile and vector matching input.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `userId` | `Id<"users">` | yes | Owner user. |
| `fullName` | `string` | yes | Seeker display name. |
| `city` | `string` | yes | Defaults to `Aktau`. |
| `district` | `string` | no | Local district preference. |
| `bio` | `string` | no | Short candidate summary. |
| `skills` | `string[]` | yes | Practical skill tags. |
| `resumeText` | `string` | no | Matching text. |
| `embedding` | `float64[]` | no | 1536-dimensional vector. |

Indexes:

- `by_userId`
- vector index `by_embedding`

### 9.3 `vacancies`

Shared table for native and HH vacancies.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `ownerUserId` | `Id<"users">` | no | Required for native employer-owned vacancies, absent for HH. |
| `source` | `native | hh` | yes | Determines mutability and apply behavior. |
| `sourceId` | `string` | yes | HH external id for HH rows; empty string for current native rows. |
| `status` | `draft | published | archived` | yes | Public listing only shows published. |
| `title` | `string` | yes | Vacancy title. |
| `description` | `string` | yes | Main content and matching text. |
| `city` | `string` | yes | Defaults to `Aktau` for native. |
| `district` | `string` | no | Local district. |
| `salaryMin` | `number` | no | Salary lower bound. |
| `salaryMax` | `number` | no | Salary upper bound. |
| `salaryCurrency` | `string` | no | Usually `KZT` where present. |
| `screeningQuestions` | `string[]` | no | Employer-controlled prompts. |
| `embedding` | `float64[]` | no | 1536-dimensional vector. |
| `externalApplyUrl` | `string` | no | Required for useful HH apply behavior. |
| `lastSyncedAt` | `number` | no | HH sync timestamp. |

Indexes:

- `by_ownerUserId`
- `by_source_sourceId`
- `by_status`
- `by_source`
- vector index `by_embedding`

### 9.4 `applications`

Native in-app application records.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `vacancyId` | `Id<"vacancies">` | yes | Must point to a published native vacancy. |
| `seekerUserId` | `Id<"users">` | yes | Applicant. |
| `status` | `submitted | reviewing | interview | rejected | hired` | yes | Controlled by state machine. |
| `screeningAnswers` | `{ question: string; answer: string }[]` | no | Submitted answers. |
| `aiScore` | `number` | no | 0 to 100 screening score. |
| `aiSummary` | `string` | no | AI-generated advisory summary. |

Indexes:

- `by_vacancyId`
- `by_seekerUserId`

### 9.5 `notifications`

Notification ledger, dedupe, read state, and delivery status.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `userId` | `Id<"users">` | yes | Recipient. |
| `type` | `new_application | status_change | strong_match | custom` | yes | Event category. |
| `dedupeKey` | `string` | yes | Deterministic dedupe key. |
| `title` | `string` | yes | Notification title. |
| `body` | `string` | yes | Notification text. |
| `deliveryStatus` | `queued | sent | failed | skipped` | yes | Telegram delivery state. |
| `sentAt` | `number` | no | Delivery attempt timestamp. |
| `readAt` | `number` | no | Frontend read timestamp. |

Indexes:

- `by_userId`
- `by_dedupeKey`

### 9.6 `reviews`

Counterparty review records tied to an application.

| Field | Type | Required |
| --- | --- | --- |
| `authorUserId` | `Id<"users">` | yes |
| `targetUserId` | `Id<"users">` | yes |
| `applicationId` | `Id<"applications">` | yes |
| `rating` | `number` | yes |
| `comment` | `string` | no |

### 9.7 `interviews`

Interview scheduling and status records.

| Field | Type | Required |
| --- | --- | --- |
| `applicationId` | `Id<"applications">` | yes |
| `vacancyId` | `Id<"vacancies">` | yes |
| `employerUserId` | `Id<"users">` | yes |
| `seekerUserId` | `Id<"users">` | yes |
| `scheduledAt` | `number` | yes |
| `locationOrLink` | `string` | no |
| `status` | `scheduled | completed | cancelled` | yes |

Indexes:

- `by_applicationId`
- `by_employerUserId`
- `by_seekerUserId`

### 9.8 `aiJobChats`

Saved AI job assistant sessions.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `userId` | `Id<"users">` | no | Owner, generally seeker/admin. |
| `title` | `string` | yes | Inferred or user-edited chat title. |
| `extractedCriteria` | `AiJobCriteria` | yes | Structured search criteria. |
| `matchedVacancyIds` | `Id<"vacancies">[]` | no | Last matched vacancy ids. |
| `createdAt` | `number` | yes | Timestamp. |
| `updatedAt` | `number` | yes | Timestamp. |

Index:

- `by_userId_and_updatedAt`

### 9.9 `aiJobChatMessages`

Persisted messages for AI job assistant sessions.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `chatId` | `Id<"aiJobChats">` | yes | Parent chat. |
| `role` | `user | assistant | system` | yes | Message speaker. |
| `content` | `string` | yes | Message body. |
| `metadata` | object | yes | Intent, criteria, vacancy ids, and source kind metadata. |
| `createdAt` | `number` | yes | Timestamp. |

Index:

- `by_chatId_and_createdAt`

## 10. Backend Function Specification

### 10.1 Users

| Function | Type | Access | Purpose |
| --- | --- | --- | --- |
| `users.syncCurrentUser` | mutation | authenticated | Create or update the Convex user row from Clerk identity. |
| `users.chooseOnboardingRole` | mutation | authenticated | Assign seeker or employer role if unassigned. |
| `users.getCurrentUser` | query | optional auth | Return current Convex user or null. |
| `users.getSelf` | query | optional auth | Return current Convex user or null. |
| `users.upsertFromBot` | internal mutation | bot HTTP only | Create or link Telegram user records. |

### 10.2 Profiles

| Function | Type | Access | Purpose |
| --- | --- | --- | --- |
| `profiles.getMyProfile` | query | seeker/admin | Return current user's profile. |
| `profiles.upsertMyProfile` | mutation | seeker/admin | Create or update profile and schedule embedding refresh. |
| `profiles.getByUserId` | internal query | internal | Fetch profile by owner. |
| `profiles.fetchByIds` | internal query | internal | Fetch multiple profiles for vector hits. |
| `profiles.setEmbedding` | internal mutation | internal | Save generated embedding. |

### 10.3 Vacancies

| Function | Type | Access | Purpose |
| --- | --- | --- | --- |
| `vacancies.createNativeVacancy` | mutation | employer/admin | Create draft native vacancy. |
| `vacancies.updateNativeVacancy` | mutation | owner/admin | Update editable native vacancy fields. |
| `vacancies.publishVacancy` | mutation | owner/admin | Set native vacancy to `published`. |
| `vacancies.archiveNativeVacancy` | mutation | owner/admin | Set native vacancy to `archived`. |
| `vacancies.getVacancy` | query | public for published, owner/admin for non-public | Fetch a single vacancy. |
| `vacancies.listPublicVacancies` | query | public/bot | List published vacancies with simple filters. |
| `vacancies.listPublic` | query | public/frontend | Bounded published vacancy listing. |
| `vacancies.listMyVacancies` | query | employer/admin | List owned vacancies. |
| `vacancies.listMyVacanciesWithApplicantCounts` | query | employer/admin | List owned vacancies with applicant counts. |
| `vacancies.listByOwner` | query | employer/admin | Bounded owned vacancy listing with applicant counts. |
| `vacancies.upsertHhVacancy` | internal mutation | HH sync | Upsert an HH record by `sourceId`. |
| `vacancies.archiveStaleHhVacancies` | internal mutation | HH sync | Archive HH rows not seen in the latest successful sync. |

### 10.4 Applications

| Function | Type | Access | Purpose |
| --- | --- | --- | --- |
| `applications.createApplication` | mutation | seeker/admin | Apply to a published native vacancy. |
| `applications.listMyApplications` | query | seeker/admin | List current user's applications. |
| `applications.listMyApplicationsWithVacancies` | query | seeker/admin | List current user's applications with vacancy data. |
| `applications.listBySeeker` | query | seeker/admin | Bounded seeker application list with vacancy data. |
| `applications.listVacancyApplications` | query | owner/admin | List applications for one vacancy. |
| `applications.listVacancyApplicationsWithProfiles` | query | owner/admin | List applications with profile data. |
| `applications.listByVacancy` | query | owner/admin | Bounded vacancy application list with profiles. |
| `applications.listMyOwnedApplicationsWithProfiles` | query | employer/admin | List applications across owned vacancies. |
| `applications.listByOwner` | query | employer/admin | Bounded owned application list with profiles. |
| `applications.updateApplicationStatus` | mutation | owner/admin | Advance status through the state machine. |
| `applications.adminRecoverApplicationStatus` | mutation | admin | Directly repair application status. |
| `applications.createFromBot` | internal mutation | bot HTTP only | Create application from Telegram user mapping. |
| `applications.saveScreeningAnalysis` | internal mutation | AI action | Save AI score and summary. |

### 10.5 AI

| Function | Type | Access | Purpose |
| --- | --- | --- | --- |
| `ai.generateVacancy` | action | caller-auth policy from frontend usage | Generate structured native vacancy fields from raw text. |
| `ai.generateScreeningQuestions` | action | caller-auth policy from frontend usage | Generate exactly three screening questions for a vacancy. |
| `ai.generateEmbedding` | action | utility | Generate a 1536-dimensional embedding. |
| `ai.analyzeScreening` | action | caller-auth policy from frontend usage | Run screening analysis for an application. |
| `ai.refreshProfileEmbedding` | internal action | scheduled/internal | Refresh profile vector and notify strong matches. |
| `ai.refreshVacancyEmbedding` | internal action | scheduled/internal | Refresh vacancy vector and notify strong matches. |
| `ai.getMatchingVacancies` | action | authenticated seeker/admin | Return vector-ranked vacancies for current profile. |
| `ai.getMatchingSeekers` | action | vacancy owner/admin | Return vector-ranked profiles for a native vacancy. |

### 10.6 AI Job Assistant

| Function | Type | Access | Purpose |
| --- | --- | --- | --- |
| `aiJobAssistant.listChats` | query | seeker/admin | List recent assistant chats. |
| `aiJobAssistant.getChat` | query | owner/admin | Fetch one assistant chat. |
| `aiJobAssistant.getChatMessages` | query | owner/admin | Fetch chat messages. |
| `aiJobAssistant.startChat` | mutation | seeker/admin | Create a saved chat. |
| `aiJobAssistant.appendMessage` | mutation | owner/admin | Append a message. |
| `aiJobAssistant.saveChat` | mutation | owner/admin | Update criteria, title, and matched vacancies. |
| `aiJobAssistant.renameChat` | mutation | owner/admin | Rename a chat. |
| `aiJobAssistant.deleteChat` | mutation | owner/admin | Delete chat and recent messages. |
| `aiJobAssistant.extractCriteria` | action | public action | Extract job criteria with fallback. |
| `aiJobAssistant.findMatches` | action | public action | Find vacancies for criteria. |
| `aiJobAssistant.sendMessage` | action | public action with optional saved chat | Process one conversation turn. |
| `aiJobAssistant.compareVacancies` | action | public action | Compare up to three vacancies. |
| `aiJobAssistant.discussVacancies` | action | public action | Answer a question about selected vacancies. |

### 10.7 Notifications

| Function | Type | Access | Purpose |
| --- | --- | --- | --- |
| `notifications.listMyNotifications` | query | authenticated | List current user's notifications. |
| `notifications.markNotificationRead` | mutation | owner | Mark one notification read. |
| `notifications.markAllNotificationsRead` | mutation | owner | Mark all current user's notifications read. |
| `notifications.dispatchNotification` | internal action | internal/bot | Enqueue and send Telegram notification if possible. |
| `notifications.handleNewApplication` | internal action | scheduled/internal | Notify employer of new application. |
| `notifications.handleStatusChange` | internal action | scheduled/internal | Notify seeker of application status change. |

### 10.8 Interviews, Reviews, Dashboards, Admin, Coach

| Module | Functions | Purpose |
| --- | --- | --- |
| `interviews` | `scheduleInterview`, `updateInterviewStatus`, `listForApplication`, `listByApplication`, `listByOwner`, `listBySeeker` | Interview scheduling and participant visibility. |
| `reviews` | `createReview`, `listReviewsForUser` | Counterparty reviews after a valid application relationship exists. |
| `dashboards` | `getSeekerSummary`, `getEmployerSummary` | Role-specific dashboard metrics. |
| `admin` | `listUsersForAdmin`, `listVacanciesForAdmin`, `listApplicationsForAdmin`, `listInterviewsForAdmin`, `listNotificationsForAdmin` | Paginated admin tables. |
| `coach` | `getMyStructuredCoach` | Seeker coaching summary and action cards. |

## 11. Business Rules

### 11.1 Vacancy Mutability

- Native vacancies are mutable by their owner employer or admin.
- HH vacancies are read-only in product flows.
- Published vacancies are visible in public listing queries.
- Draft and archived vacancies are visible only to owner/admin through allowed queries.

### 11.2 Application Creation

Applications may be created only when:

- The applicant is a seeker or admin.
- The vacancy exists.
- The vacancy has `source = native`.
- The vacancy has `status = published`.
- The seeker has not already applied to the same vacancy.

HH vacancies must never create in-app applications.

### 11.3 Application State Machine

Allowed transitions:

| From | To |
| --- | --- |
| `submitted` | `reviewing` |
| `reviewing` | `interview`, `rejected` |
| `interview` | `hired`, `rejected` |
| `rejected` | none |
| `hired` | none |

Only admins may bypass this flow through `adminRecoverApplicationStatus`.

### 11.4 Interviews

- Interviews can be scheduled only by vacancy owner/admin.
- The application must be in `interview` status.
- Interview participants are the employer owner and seeker from the application.
- Interview reads require participant or admin access.

### 11.5 Reviews

- A review must be tied to an existing application.
- The reviewer must be either the seeker or the vacancy owner.
- The target must be the counterparty from the same application.
- Users cannot review themselves.

### 11.6 Notifications

- Notification dedupe keys must be deterministic.
- Duplicate dedupe keys return the existing notification rather than creating spam.
- Missing Telegram linkage results in `skipped`, not failure of the main business mutation.
- Telegram API failures mark notification delivery as `failed`.
- Notification read state is tracked independently from Telegram delivery state.

## 12. AI Specification

### 12.1 Provider Contract

OpenRouter is used for:

- structured JSON chat completions
- embeddings

The backend validates structured outputs with Zod before returning or persisting them. Embeddings must have exactly `1536` dimensions.

### 12.2 Vacancy Generation

Input:

- Raw employer vacancy text.

Output:

- `source: native`
- `title`
- `description`
- `city`
- `salaryMin`
- `salaryMax`
- `salaryCurrency`

Generated output is a draft suggestion and must not bypass employer review.

### 12.3 Screening Questions

Input:

- Existing vacancy id.

Output:

- Exactly three screening questions.

The employer may edit or replace generated questions before using them.

### 12.4 Screening Analysis

Input:

- Application id with screening answers.

Output:

- `score` between 0 and 100.
- `summary` with advisory rationale.

AI screening is advisory and must not automatically reject or hire candidates.

### 12.5 Vector Matching

The system stores embeddings on:

- profiles
- vacancies

Profile embedding text includes:

- full name
- city
- bio
- skills
- resume text

Vacancy embedding text includes:

- title
- city
- description

Match scores are normalized from vector scores into a 0 to 100 scale. Scores at or above `85` are considered strong matches and can trigger deduped notifications.

### 12.6 AI Degradation

If OpenRouter fails:

- Core profile, vacancy, and application mutations should still complete when possible.
- Assistant search should use deterministic fallback extraction and public vacancy fallback listing.
- Missing embeddings should return empty match results instead of crashing user-facing flows.

## 13. HH Sync Specification

HH sync runs through `hhSync.syncHHVacancies`, scheduled in `crons.ts` every 30 minutes.

Sync requirements:

- Fetch HH vacancies from `https://api.hh.ru/vacancies`.
- Use `area=159`.
- Use `per_page=100`.
- Iterate all pages returned by the API.
- Normalize HH fields into the shared vacancy shape.
- Upsert by `source = hh` and `sourceId`.
- Mark imported or changed records as `published`.
- Refresh vacancy embeddings only when matching text changed.
- Archive stale HH vacancies only after a complete successful sync.
- Never delete stale HH vacancies automatically.

Normalized HH fields:

| HH source | JumysAI field |
| --- | --- |
| `id` | `sourceId` |
| `name` | `title` |
| `snippet.responsibility` and `snippet.requirement` | `description` |
| `area.name` | `city` |
| `salary.from` | `salaryMin` |
| `salary.to` | `salaryMax` |
| `salary.currency` | `salaryCurrency` |
| `alternate_url` | `externalApplyUrl` |

## 14. Telegram Bot HTTP Contract

All bot HTTP routes require the shared secret checked by `assertSharedSecret`.

| Route | Method | Request | Response | Purpose |
| --- | --- | --- | --- | --- |
| `/bot/users/upsert` | `POST` | `telegramChatId`, optional `telegramUsername`, `clerkId`, `role` | `{ user }` | Link or create Telegram user. |
| `/bot/vacancies` | `GET` | query `city`, `limit` | `{ vacancies }` | List public vacancies. |
| `/bot/vacancies` | `POST` | JSON `city`, `limit` | `{ vacancies }` | List public vacancies. |
| `/bot/applications` | `POST` | `telegramChatId`, `vacancyId`, optional `screeningAnswers` | `{ application }` | Submit an application as a Telegram-linked seeker. |
| `/bot/notifications/send` | `POST` | `userId`, `type`, `dedupeKey`, `title`, `body` | `{ notification }` | Dispatch a deduped notification. |

HTTP error behavior:

- Unauthorized shared secret returns status `401`.
- Validation and business errors return status `400`, except unknown Telegram user for application creation returns `404`.

## 15. Frontend Specification

### 15.1 App Initialization

The app must:

- Read runtime config from Vite environment variables.
- Require `VITE_CONVEX_URL`.
- Require a real Clerk publishable key beginning with `pk_test_` or `pk_live_`.
- Default `VITE_CLERK_JWT_TEMPLATE` to `convex`.
- Render a missing configuration screen when required values are absent.
- Mount `ClerkProvider` and `ConvexProviderWithAuth` only when config is valid.

### 15.2 Routing and Access Control

Protected routes must:

- Wait for Clerk auth to load.
- Redirect signed-out users to `/login`.
- Wait for Convex auth to become authenticated.
- Sync the current Convex user row when missing.
- Redirect users without role to `/onboarding` except where unassigned role is allowed.
- Enforce role allow-lists client-side for UX.
- Redirect seekers and employers away from routes they cannot use.

Backend authorization remains mandatory.

### 15.3 UX Requirements

The web app should:

- Use role-specific app shells and navigation.
- Show loading, empty, error, AI-unavailable, and partial-result states.
- Keep vacancy source visible.
- Keep native and HH apply behavior distinct.
- Use concise tables for operational lists.
- Preserve responsive behavior for mobile through mobile navigation and layout helpers.
- Avoid product mock data in production-facing screens.

### 15.4 Internationalization and Local Context

The product is local to Aktau. User-facing text may include Russian/Kazakh local labor market language. The implementation currently stores and renders some local strings directly in components and helper modules.

## 16. Configuration

### 16.1 Backend Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `CLERK_JWT_ISSUER_DOMAIN` | yes | Clerk issuer domain for Convex auth config. |
| `BOT_SHARED_SECRET` | yes | Shared secret for bot HTTP actions. |
| `OPENROUTER_API_KEY` | yes for AI | OpenRouter credential. |
| `OPENROUTER_BASE_URL` | no | Defaults to `https://openrouter.ai/api/v1`. |
| `OPENROUTER_CHAT_MODEL` | no | Defaults to `openai/gpt-4o-mini`. |
| `OPENROUTER_COMPLEX_MODEL` | no | Defaults to `openai/gpt-4o`. |
| `OPENROUTER_EMBEDDING_MODEL` | no | Defaults to `text-embedding-3-small`. |
| `TELEGRAM_BOT_TOKEN` | yes for Telegram delivery | Telegram Bot API token. |

### 16.2 Frontend Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_CONVEX_URL` | yes | Convex deployment URL. |
| `VITE_CLERK_PUBLISHABLE_KEY` | yes | Clerk browser publishable key. |
| `VITE_CLERK_JWT_TEMPLATE` | no | Clerk token template, defaults to `convex`. |
| `VITE_TELEGRAM_BOT_URL` | no | Telegram bot link for UI surfaces. |

## 17. Testing and Verification

### 17.1 Backend Tests

Backend/domain tests live in `tests/` and currently cover:

- application state transitions
- vacancy apply rules
- notification dedupe keys
- match score normalization
- onboarding role restrictions
- HH normalization and change detection
- bot shared-secret validation
- AI job assistant fallback extraction, explanations, and comparison
- structured seeker coach output

### 17.2 Frontend Tests

Frontend tests live in `web/src/**/*.test.*` and currently cover:

- no product mocks guard
- shell/sidebar rendering
- AI search local storage
- AI vacancy result and compare panel behavior
- seeker dashboard behavior
- profile editor behavior
- public home page behavior
- responsive/mobile hook behavior
- formatting helpers
- runtime config validation
- status helpers
- route guard behavior

### 17.3 Verification Commands

Backend:

```bash
npm run typecheck
npm test
```

Frontend:

```bash
cd web
npm run build
npm test
```

Convex code generation, when needed:

```bash
npm run convex:codegen
```

## 18. Security Requirements

- Use `ctx.auth.getUserIdentity()` on the backend for authenticated web users.
- Prefer Clerk `tokenIdentifier` over `subject` for stable identity keys when available.
- Never accept user ids from frontend arguments for authorization decisions.
- Keep sensitive internal functions registered as `internalQuery`, `internalMutation`, or `internalAction`.
- Validate every Convex function argument.
- Validate every bot HTTP payload with Zod.
- Protect bot routes with `BOT_SHARED_SECRET`.
- Keep OpenRouter and Telegram credentials server-side.
- Keep admin-only data behind admin role checks.
- Ensure HH vacancies remain read-only through public app and bot flows.

## 19. Performance and Reliability Requirements

- Use Convex indexes for common lookup paths.
- Keep public vacancy listing bounded to at most 50 rows per call.
- Use vector indexes for profile and vacancy matching.
- Keep embedding dimension fixed at 1536 until a deliberate migration changes it.
- Schedule embedding refreshes asynchronously after profile and vacancy changes.
- Make notification dispatch non-blocking relative to primary business mutations.
- Avoid provider failures rolling back core application operations where possible.
- Archive stale HH vacancies instead of deleting them.

## 20. Known Implementation Constraints

The current implementation is production-shaped but still lean. The following constraints should guide future work:

- Some query paths use `.collect()` for owned or admin workflows. Large production datasets should move those paths to pagination or bounded reads.
- Native vacancy `sourceId` currently uses an empty string. If native vacancies need stable public slugs or import parity, introduce a first-class native source id strategy.
- AI actions expose useful operations but should be reviewed for explicit role checks wherever they become reachable from sensitive UI paths.
- The frontend README is still the default Vite README and should be replaced with project-specific setup documentation.
- The bot runtime is outside this repository; this repository specifies only the Convex HTTP contract.

## 21. Delivery Acceptance Criteria

The current phase is complete when:

- The web app boots with valid Clerk and Convex configuration.
- Users can sign in and select seeker or employer roles.
- Seekers can complete profiles, search vacancies, use AI search, apply to native vacancies, and track application status.
- Employers can create, update, publish, and archive native vacancies.
- Employers can review applications with profile and AI screening context.
- Application transitions follow the specified state machine.
- Interviews can be scheduled and updated for interview-stage applications.
- Notifications are persisted, deduped, readable in the frontend, and delivered to Telegram when configured.
- HH sync imports, updates, and archives vacancies conservatively.
- Admin pages can inspect core tables through paginated Convex queries.
- Backend and frontend test suites pass for the covered behaviors.

