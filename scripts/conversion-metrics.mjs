// Conversion funnel metrics, read-only.
//
// Covers the four funnel figures that are already recorded in Postgres.
// The two that aren't -- the paywall impression and the upgrade click --
// are UI events with no database trace and live in Vercel Analytics
// instead (see src/lib/analytics.ts). Together they give the full funnel:
//
//   signup -> reached L2 -> [paywall_shown -> upgrade_clicked] -> paid
//                            \___ Vercel Analytics ___/
//
// Deliberately queries no identifiers -- only aggregates.
//
// Run: node scripts/conversion-metrics.mjs
import "dotenv/config";
import pg from "pg";

// Keep in sync with src/lib/xpProgression.ts. Cumulative XP to *reach* a
// level: L2 = 100, L3 = 100 + 150 = 250 (the free cap).
const XP_FOR_LEVEL_2 = 100;
const FREE_XP_CAP = 250;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

const pct = (part, whole) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : "n/a");

const [totals] = (
  await client.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE xp >= $1)::int AS reached_l2,
            count(*) FILTER (WHERE xp >= $2)::int AS past_cap,
            count(*) FILTER (WHERE "subscriptionStatus" = 'pro')::int AS paid,
            count(*) FILTER (WHERE "freeTrialUsedAt" IS NOT NULL)::int AS used_trial
       FROM "User"`,
    [XP_FOR_LEVEL_2, FREE_XP_CAP]
  )
).rows;

// Signup to hitting the cap, i.e. how long the free tier lasts before the
// paywall is the next thing standing in the way.
const [timing] = (
  await client.query(
    `SELECT round(avg(EXTRACT(EPOCH FROM (first_attempt - created))/60)::numeric, 1) AS avg_minutes
       FROM (SELECT u."createdAt" AS created, min(a."createdAt") AS first_attempt
               FROM "User" u
               JOIN "Attempt" a ON a."userId" = u.id
              WHERE u.xp >= $1
              GROUP BY u.id, u."createdAt") s`,
    [FREE_XP_CAP]
  )
).rows;

console.log(`\nTotal users            ${totals.total}`);
console.log(`Reached level 2        ${totals.reached_l2}  (${pct(totals.reached_l2, totals.total)})   target >80%`);
console.log(`Past the free cap      ${totals.past_cap}  (${pct(totals.past_cap, totals.reached_l2)} of those at L2)`);
console.log(`Used the free trial    ${totals.used_trial}  (${pct(totals.used_trial, totals.past_cap)} of those past the cap)`);
console.log(`Paid for Pro           ${totals.paid}  (${pct(totals.paid, totals.total)})   target >1-3%`);
console.log(`Signup -> cap          ${timing.avg_minutes ?? "n/a"} min   target <20 min`);
console.log(`\nPaywall impressions and upgrade clicks: Vercel dashboard -> Analytics -> Events\n`);

await client.end();
