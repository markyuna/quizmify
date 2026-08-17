const PRODUCTION_SITE_URL = "https://www.quizmify.com";

/**
 * Base URL used for absolute links (emails, referral links, Stripe
 * redirects, SEO metadata). NEXTAUTH_URL is the source of truth in every
 * environment; the fallback only kicks in when it's unset.
 */
export function getSiteUrl(): string {
  const fallback = process.env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : "http://localhost:3000";
  return (process.env.NEXTAUTH_URL ?? fallback).replace(/\/$/, "");
}

export const SITE_URL = getSiteUrl();
