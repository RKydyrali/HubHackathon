/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as aiJobAssistant from "../aiJobAssistant.js";
import type * as applicationMessages from "../applicationMessages.js";
import type * as applications from "../applications.js";
import type * as coach from "../coach.js";
import type * as companyTrust from "../companyTrust.js";
import type * as crons from "../crons.js";
import type * as dashboards from "../dashboards.js";
import type * as dataLifecycle from "../dataLifecycle.js";
import type * as demoAnalytics from "../demoAnalytics.js";
import type * as hhSync from "../hhSync.js";
import type * as http from "../http.js";
import type * as interviewScenarios from "../interviewScenarios.js";
import type * as interviews from "../interviews.js";
import type * as lib_aiJobAssistantSchemas from "../lib/aiJobAssistantSchemas.js";
import type * as lib_aiJobAssistantValidators from "../lib/aiJobAssistantValidators.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_botUserHttpSchema from "../lib/botUserHttpSchema.js";
import type * as lib_coach from "../lib/coach.js";
import type * as lib_companyTrust from "../lib/companyTrust.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_demoAnalytics from "../lib/demoAnalytics.js";
import type * as lib_domain from "../lib/domain.js";
import type * as lib_hh from "../lib/hh.js";
import type * as lib_http from "../lib/http.js";
import type * as lib_jobPostTrust from "../lib/jobPostTrust.js";
import type * as lib_logger from "../lib/logger.js";
import type * as lib_mockInterviewHardening from "../lib/mockInterviewHardening.js";
import type * as lib_notificationCopyRu from "../lib/notificationCopyRu.js";
import type * as lib_notificationPreferences from "../lib/notificationPreferences.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_prompts from "../lib/prompts.js";
import type * as lib_recruiterAssistantSchemas from "../lib/recruiterAssistantSchemas.js";
import type * as lib_recruiterChatValidators from "../lib/recruiterChatValidators.js";
import type * as lib_resumeProfileExtraction from "../lib/resumeProfileExtraction.js";
import type * as lib_telegramLinking from "../lib/telegramLinking.js";
import type * as lib_validators from "../lib/validators.js";
import type * as notifications from "../notifications.js";
import type * as postHire from "../postHire.js";
import type * as profiles from "../profiles.js";
import type * as recruiterAssistant from "../recruiterAssistant.js";
import type * as recruiterAssistantActions from "../recruiterAssistantActions.js";
import type * as reviews from "../reviews.js";
import type * as seed_mangystau from "../seed/mangystau.js";
import type * as seed_mangystauDict from "../seed/mangystauDict.js";
import type * as telegramLinking from "../telegramLinking.js";
import type * as users from "../users.js";
import type * as vacancies from "../vacancies.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  aiJobAssistant: typeof aiJobAssistant;
  applicationMessages: typeof applicationMessages;
  applications: typeof applications;
  coach: typeof coach;
  companyTrust: typeof companyTrust;
  crons: typeof crons;
  dashboards: typeof dashboards;
  dataLifecycle: typeof dataLifecycle;
  demoAnalytics: typeof demoAnalytics;
  hhSync: typeof hhSync;
  http: typeof http;
  interviewScenarios: typeof interviewScenarios;
  interviews: typeof interviews;
  "lib/aiJobAssistantSchemas": typeof lib_aiJobAssistantSchemas;
  "lib/aiJobAssistantValidators": typeof lib_aiJobAssistantValidators;
  "lib/auth": typeof lib_auth;
  "lib/botUserHttpSchema": typeof lib_botUserHttpSchema;
  "lib/coach": typeof lib_coach;
  "lib/companyTrust": typeof lib_companyTrust;
  "lib/constants": typeof lib_constants;
  "lib/demoAnalytics": typeof lib_demoAnalytics;
  "lib/domain": typeof lib_domain;
  "lib/hh": typeof lib_hh;
  "lib/http": typeof lib_http;
  "lib/jobPostTrust": typeof lib_jobPostTrust;
  "lib/logger": typeof lib_logger;
  "lib/mockInterviewHardening": typeof lib_mockInterviewHardening;
  "lib/notificationCopyRu": typeof lib_notificationCopyRu;
  "lib/notificationPreferences": typeof lib_notificationPreferences;
  "lib/openrouter": typeof lib_openrouter;
  "lib/permissions": typeof lib_permissions;
  "lib/prompts": typeof lib_prompts;
  "lib/recruiterAssistantSchemas": typeof lib_recruiterAssistantSchemas;
  "lib/recruiterChatValidators": typeof lib_recruiterChatValidators;
  "lib/resumeProfileExtraction": typeof lib_resumeProfileExtraction;
  "lib/telegramLinking": typeof lib_telegramLinking;
  "lib/validators": typeof lib_validators;
  notifications: typeof notifications;
  postHire: typeof postHire;
  profiles: typeof profiles;
  recruiterAssistant: typeof recruiterAssistant;
  recruiterAssistantActions: typeof recruiterAssistantActions;
  reviews: typeof reviews;
  "seed/mangystau": typeof seed_mangystau;
  "seed/mangystauDict": typeof seed_mangystauDict;
  telegramLinking: typeof telegramLinking;
  users: typeof users;
  vacancies: typeof vacancies;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
