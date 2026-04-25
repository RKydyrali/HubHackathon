/** Truncate outbound apply URLs for demo analytics (avoid oversized rows). */
const DEMO_ANALYTICS_URL_MAX = 500;

export function demoAnalyticsApplyUrlMetadata(url: string | undefined): { url: string } | undefined {
  if (!url) return undefined;
  return { url: url.slice(0, DEMO_ANALYTICS_URL_MAX) };
}
