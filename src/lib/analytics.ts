/**
 * Analytics event tracking for conversion optimization.
 * Events are sent to the backend for aggregation and analysis.
 */

export type AnalyticsEvent =
  | "users_reached_level_2"
  | "users_attempted_level_3"
  | "paywall_modal_shown"
  | "upgrade_clicked"
  | "upgrade_clicked_from_paywall_modal"
  | "upgrade_initiated"
  | "paywall_modal_dismissed"
  | "paywall_dismissed"
  | "paywall_modal_closed"
  | "conversion_at_paywall"
  | "pro_user_login";

type EventMetadata = Record<string, string | number | boolean>;

/**
 * Track an analytics event.
 * In development, logs to console. In production, would send to analytics service.
 */
export function trackEvent(event: AnalyticsEvent, metadata?: EventMetadata): void {
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`📊 Event: ${event}`, metadata || "");
  }

  // TODO: Send to analytics service (Mixpanel, Amplitude, custom backend, etc.)
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ event, metadata, timestamp: new Date().toISOString() })
  // }).catch(err => console.error('Analytics tracking failed:', err));
}

/**
 * Track when a user reaches level 2 (free tier max).
 */
export function trackReachedLevel2(): void {
  trackEvent("users_reached_level_2");
}

/**
 * Track when a user attempts to progress to level 3 (paywall trigger).
 */
export function trackAttemptedLevel3(): void {
  trackEvent("users_attempted_level_3");
}

/**
 * Track a successful upgrade conversion from the paywall.
 */
export function trackUpgradeConversion(): void {
  trackEvent("conversion_at_paywall");
}
