import { track } from "@vercel/analytics";

/**
 * Conversion-funnel tracking, deliberately limited to the two steps that
 * leave no trace in Postgres: the paywall impression and the upgrade
 * click. Everything else in the funnel is already recorded in the database
 * and should be queried there instead of duplicated here --
 *
 *   % reaching the cap   SELECT count(*) FROM "User" WHERE xp >= 250
 *   quizzes completed    SELECT count(*) FROM "Attempt"
 *   signups              SELECT count(*) FROM "User" WHERE "createdAt" > ...
 *   conversions          SELECT count(*) FROM "User"
 *                          WHERE "subscriptionStatus" = 'pro'
 *
 * No user id or other identifier is ever sent. Vercel Analytics already
 * aggregates by session, which is enough for every funnel percentage we
 * care about, and keeping identifiers out means this stays covered by the
 * existing privacy policy (which lists Vercel as a host, not an analytics
 * processor) instead of turning behavioural events into personal data
 * shipped outside the EU.
 */
export type AnalyticsEvent =
  /** The upgrade modal became visible to a free user blocked at the cap. */
  | "paywall_shown"
  /** The user clicked through to /upgrade from the paywall. */
  | "upgrade_clicked"
  /** The user closed the paywall without upgrading. */
  | "paywall_dismissed";

/**
 * Vercel only accepts flat primitives as event properties -- nested
 * objects are silently dropped, so the type is enforced here rather than
 * discovered in a dashboard with missing dimensions.
 */
type EventProperties = Record<string, string | number | boolean | null>;

export function trackEvent(event: AnalyticsEvent, properties?: EventProperties): void {
  track(event, properties);
}
