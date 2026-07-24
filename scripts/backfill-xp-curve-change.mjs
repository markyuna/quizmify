// One-off migration: compensates users demoted by the XP curve change.
//
// The curve went from "level N costs 100*N XP" to an explicit table with a
// deliberate jump at level 3 (see src/lib/xpProgression.ts). That change is
// retroactive: the same XP total buys fewer levels than it used to, so any
// user sitting above the old level-6 threshold but below the new one lost a
// level with no warning and nothing they did wrong.
//
// This grants each affected user the minimum XP needed to hold the level
// they already had. It deliberately does not try to preserve their fractional
// progress *into* that level -- that would mean inventing more XP than the
// regression actually cost them.
//
// Run:      node scripts/backfill-xp-curve-change.mjs --dry-run
// Apply:    node scripts/backfill-xp-curve-change.mjs
import "dotenv/config";
import pg from "pg";

// Curve in force before the change: clearing level N cost 100*N.
const oldCumulativeXp = (level) => (100 * (level - 1) * level) / 2;

// Current curve. Keep in sync with src/lib/xpProgression.ts.
const NEW_CURVE = { 1: 100, 2: 150, 3: 400, 4: 500, 5: 600, 6: 700 };
const newXpForLevel = (level) => (level < 1 || level > 6 ? 700 : NEW_CURVE[level]);
const newCumulativeXp = (level) => {
  let total = 0;
  for (let i = 1; i < level; i++) total += newXpForLevel(i);
  return total;
};

const levelFor = (xp, cumulative) => {
  let level = 1;
  while (cumulative(level + 1) <= xp) level++;
  return level;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const client = new pg.Client({ connectionString });
await client.connect();

const users = (await client.query(`SELECT id, email, xp, level FROM "User" ORDER BY xp DESC`)).rows;

const affected = users
  .map((user) => {
    const previousLevel = levelFor(user.xp, oldCumulativeXp);
    const currentLevel = levelFor(user.xp, newCumulativeXp);
    return { ...user, previousLevel, currentLevel, targetXp: newCumulativeXp(previousLevel) };
  })
  .filter((user) => user.currentLevel < user.previousLevel);

if (affected.length === 0) {
  console.log("No users were demoted by the curve change. Nothing to do.");
  await client.end();
  process.exit(0);
}

console.log(`${affected.length} user(s) demoted by the curve change:\n`);
for (const user of affected) {
  console.log(
    `  ${user.email ?? user.id}\n` +
      `    L${user.previousLevel} -> L${user.currentLevel}   xp ${user.xp} -> ${user.targetXp} ` +
      `(+${user.targetXp - user.xp}), restores L${user.previousLevel}`
  );
}

if (dryRun) {
  console.log("\nDry run -- nothing written. Re-run without --dry-run to apply.");
  await client.end();
  process.exit(0);
}

// Single transaction: a partial backfill would leave the level column
// disagreeing with xp for whoever didn't get updated.
await client.query("BEGIN");
try {
  for (const user of affected) {
    await client.query(`UPDATE "User" SET xp = $1, level = $2 WHERE id = $3`, [
      user.targetXp,
      user.previousLevel,
      user.id,
    ]);
  }
  await client.query("COMMIT");
  console.log(`\nApplied to ${affected.length} user(s).`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("\nRolled back:", error.message);
  process.exitCode = 1;
}

await client.end();
