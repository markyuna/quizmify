import type { Prisma, GuestAttempt } from "@/generated/prisma/client";
import { GuestGameKey } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";
import { registerQuizActivity } from "@/lib/streak";
import { calculateEarnedXpBreakdown, calculateLevel } from "@/lib/xp";
import { FREE_LEVEL_CAP } from "@/lib/stripe";
import { isEffectivelyPro } from "@/lib/pro";
import type { Locale } from "@/i18n/locales";

export { GuestGameKey };

export const GUEST_GAME_KEYS = Object.values(GuestGameKey);

export function isGuestGameKey(value: string): value is GuestGameKey {
  return (GUEST_GAME_KEYS as readonly string[]).includes(value);
}

/** UTC calendar day as "YYYY-MM-DD" -- same idiom as getTodayDateKey in dailyChallenge.ts. */
export function getTodayDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * A guestId is minted client-side (see useGuestRound.ts) and stashed in a
 * cookie, mirroring the quizmify_ref referral cookie. It's never PII and
 * carries no privilege -- it's only a partition key for "one attempt per
 * guest per game per day," so validation here is just a sanity bound
 * against abuse/storage bloat, not a security boundary.
 */
export function isValidGuestId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(value);
}

type JsonRecord = Record<string, unknown>;

/**
 * Per-game plug-in: each of the 3 games registers its own challenge
 * generation and grading here, but never touches the shared plumbing above
 * (daily rotation, one-attempt guard, guest persistence, claim/migration).
 * `payload` is the full challenge including its answer key -- grade() sees
 * it, but toClientChallenge() must strip anything that would let the answer
 * leak to the browser before the guest submits.
 */
export type GuestGameDefinition<TPayload extends JsonRecord = JsonRecord, TAnswer = unknown> = {
  gameKey: GuestGameKey;
  generateChallenge(dateKey: string, language: Locale): Promise<TPayload> | TPayload;
  toClientChallenge(payload: TPayload): JsonRecord;
  grade(payload: TPayload, answer: TAnswer): { isCorrect: boolean; resultPayload: JsonRecord };
};

const registry = new Map<GuestGameKey, GuestGameDefinition>();

export function registerGuestGame(definition: GuestGameDefinition) {
  registry.set(definition.gameKey, definition);
}

function getGuestGame(gameKey: GuestGameKey): GuestGameDefinition {
  const definition = registry.get(gameKey);
  if (!definition) {
    throw new Error(`No guest game registered for "${gameKey}" yet`);
  }
  return definition;
}

/** Whether a gameKey currently has a real generator/grader registered (vs. Phase 1's "coming soon" cards). */
export function isGuestGameImplemented(gameKey: GuestGameKey): boolean {
  return registry.has(gameKey);
}

/**
 * Returns today's shared challenge for this game+language, generating and
 * persisting it on first access. Race-safe the same way
 * getOrCreateTodaysChallenge is: a losing concurrent insert just re-fetches
 * the winner's row instead of erroring.
 */
export async function getOrCreateTodaysGuestChallenge(
  gameKey: GuestGameKey,
  language: Locale,
  now: Date = new Date()
) {
  const dateKey = getTodayDateKey(now);
  const where = { gameKey_date_language: { gameKey, date: dateKey, language } };

  const existing = await prisma.dailyGameChallenge.findUnique({ where });
  if (existing) return existing;

  const definition = getGuestGame(gameKey);
  const payload = await definition.generateChallenge(dateKey, language);

  try {
    return await prisma.dailyGameChallenge.create({
      data: {
        gameKey,
        date: dateKey,
        language,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  } catch {
    const winner = await prisma.dailyGameChallenge.findUnique({ where });
    if (!winner) throw new Error(`Failed to create or fetch today's ${gameKey} challenge`);
    return winner;
  }
}

/** Flat completion+correctness formula shared with regular quizzes -- a guest round is a 1-question attempt. */
function computeGuestXp(isCorrect: boolean): number {
  return calculateEarnedXpBreakdown({ correctAnswers: isCorrect ? 1 : 0, totalQuestions: 1 }).totalXp;
}

/**
 * Resolves the challenge a submit should grade against. Prefers the exact
 * row the client actually played (challengeId, from its original GET) over
 * re-deriving "today" from the server clock -- a round that started before
 * midnight UTC and submitted after it would otherwise get graded against a
 * different day's challenge than the one its guesses were scored against
 * live (see /api/guest/word_of_day/guess, which was already correct: it
 * always looks up by challengeId, never by date). Falls back to the by-date
 * lookup when no challengeId is given (older client) or it doesn't resolve
 * to a real challenge for this exact gameKey+language (stale id, tampered
 * value, deleted row) -- never a fatal error, just the pre-existing
 * behavior.
 */
async function resolveGuestChallenge(
  gameKey: GuestGameKey,
  language: Locale,
  now: Date,
  challengeId?: string
) {
  if (challengeId) {
    const byId = await prisma.dailyGameChallenge.findUnique({ where: { id: challengeId } });
    if (byId && byId.gameKey === gameKey && byId.language === language) {
      return byId;
    }
  }

  return getOrCreateTodaysGuestChallenge(gameKey, language, now);
}

export type SubmitGuestAttemptParams = {
  gameKey: GuestGameKey;
  language: Locale;
  guestId: string;
  answer: unknown;
  challengeId?: string;
  // The authenticated userId at submit time, if any -- lets this reject a
  // replay of a gameKey+day this account already completed under a
  // *different* guestId (new device, cleared cookie, private window). The
  // guestId-scoped [challengeId, guestId] constraint below never caught
  // this, since a fresh guestId always looks unplayed to it. See
  // UserDailyAttempt's schema comment for the full incident this closes.
  userId?: string | null;
  now?: Date;
};

export type SubmitGuestAttemptResult =
  // This exact account already has a UserDailyAttempt for this
  // gameKey+day (from this or a different guestId) -- no new GuestAttempt
  // was created, nothing to grade again. Callers surface the same generic
  // "already played" response a guest gets, never the real past result.
  | { alreadyPlayedByUser: true; attemptId: string }
  | { alreadyPlayedByUser: false; attempt: GuestAttempt; alreadyPlayed: boolean };

/**
 * Grades a guest's answer server-side (the client never sees the answer key
 * ahead of time) and persists the attempt. The [challengeId, guestId]
 * unique constraint is the real one-attempt-per-day guard *for a given
 * guestId*; an already-existing attempt is returned as-is rather than
 * re-graded, so a guest can't retry by resubmitting. When `userId` is
 * known, UserDailyAttempt is checked first -- that's the per-account guard
 * that guestId alone can't provide.
 */
export async function submitGuestAttempt({
  gameKey,
  language,
  guestId,
  answer,
  challengeId,
  userId,
  now = new Date(),
}: SubmitGuestAttemptParams): Promise<SubmitGuestAttemptResult> {
  const challenge = await resolveGuestChallenge(gameKey, language, now, challengeId);
  // The attempt's own date always matches the challenge it was actually
  // graded against, not the server clock at submit time -- see
  // resolveGuestChallenge's comment for why those can differ.
  const dateKey = challenge.date;

  if (userId) {
    const existingForUser = await prisma.userDailyAttempt.findUnique({
      where: { userId_gameKey_date: { userId, gameKey, date: dateKey } },
    });
    if (existingForUser) {
      return { alreadyPlayedByUser: true, attemptId: existingForUser.guestAttemptId };
    }
  }

  const existing = await prisma.guestAttempt.findUnique({
    where: { challengeId_guestId: { challengeId: challenge.id, guestId } },
  });
  if (existing) {
    return { alreadyPlayedByUser: false, attempt: existing, alreadyPlayed: true };
  }

  const definition = getGuestGame(gameKey);
  const { isCorrect, resultPayload } = definition.grade(challenge.payload as JsonRecord, answer);
  const xpEarned = computeGuestXp(isCorrect);

  try {
    const attempt = await prisma.guestAttempt.create({
      data: {
        challengeId: challenge.id,
        gameKey,
        date: dateKey,
        guestId,
        resultPayload: resultPayload as Prisma.InputJsonValue,
        isCorrect,
        xpEarned,
      },
    });
    return { alreadyPlayedByUser: false, attempt, alreadyPlayed: false };
  } catch {
    // Two submits raced (double-click, retry) -- the loser just reads the winner's row.
    const winner = await prisma.guestAttempt.findUnique({
      where: { challengeId_guestId: { challengeId: challenge.id, guestId } },
    });
    if (!winner) throw new Error("Failed to create or fetch guest attempt");
    return { alreadyPlayedByUser: false, attempt: winner, alreadyPlayed: true };
  }
}

export async function getTodaysClientChallenge(
  gameKey: GuestGameKey,
  language: Locale,
  guestId: string | null,
  userId: string | null = null,
  now: Date = new Date()
) {
  const challenge = await getOrCreateTodaysGuestChallenge(gameKey, language, now);
  const definition = getGuestGame(gameKey);

  const [attemptedByGuest, attemptedByUser] = await Promise.all([
    guestId
      ? prisma.guestAttempt.count({ where: { challengeId: challenge.id, guestId } })
      : Promise.resolve(0),
    // The per-account guard -- catches "already played today, but this
    // browser's guestId cookie is new" (see submitGuestAttempt's own
    // comment), which the guestId count above can never see.
    userId
      ? prisma.userDailyAttempt.count({ where: { userId, gameKey, date: challenge.date } })
      : Promise.resolve(0),
  ]);

  return {
    challengeId: challenge.id,
    date: challenge.date,
    challenge: definition.toClientChallenge(challenge.payload as JsonRecord),
    attempted: attemptedByGuest > 0 || attemptedByUser > 0,
  };
}

export type ClaimGuestAttemptsResult = {
  claimedCount: number;
  xpAwarded: number;
};

/**
 * Migrates every not-yet-claimed guest attempt for guestId onto userId:
 * awards the summed XP and starts the shared streak (registerQuizActivity),
 * called once regardless of how many of the 3 games the guest played --
 * one registration event is one day of activity, not one per game. Safe to
 * call repeatedly (e.g. GuestRoundClaim retrying): once a row is claimed it
 * never gets claimed or paid out again, and calling with nothing left to
 * claim is a no-op.
 *
 * Race-safe against two concurrent claims for the same guestId (e.g. a
 * duplicate retry firing before the first one committed): the update is
 * scoped to claimedByUserId: null, so Postgres row locking guarantees only
 * one transaction can flip a given row from null, and XP is summed only
 * over the rows this call actually won.
 *
 * Per-row, this is also the other UserDailyAttempt integration point (see
 * submitGuestAttempt's for the first one): a guestId can carry a pending
 * attempt for a gameKey+day this userId already completed via a *different*
 * guestId (played anonymously, then logged into an account that already
 * played today elsewhere) -- submitGuestAttempt's own guard can't catch
 * that, since userId wasn't known yet when this row was created. Every
 * candidate still gets claimedByUserId set (never left orphaned), but only
 * the first one for a given gameKey+day is credited with XP and gets a
 * UserDailyAttempt row.
 *
 * Deliberately check-then-create (tx.userDailyAttempt.findUnique() before
 * create()) rather than relying on the unique constraint as the decision
 * mechanism: a constraint violation mid-$transaction aborts every later
 * statement in it ("current transaction is aborted"), which would also
 * tank legitimate rows claimed earlier in the same loop. Two candidates in
 * *this* loop for the same gameKey+day (e.g. the fr and es challenge both
 * played the same UTC day) are still handled safely -- a transaction sees
 * its own uncommitted writes, so the second candidate's findUnique sees
 * the first candidate's create. A genuinely concurrent second
 * claimGuestAttempts call landing at the exact same instant can still hit
 * the constraint and abort that whole call -- an accepted, safe failure
 * mode (nothing partially commits) that the next retry (GuestRoundClaim
 * already retries on every page load) resolves cleanly.
 */
export async function claimGuestAttempts(
  userId: string,
  guestId: string,
  now: Date = new Date()
): Promise<ClaimGuestAttemptsResult> {
  return prisma.$transaction(async (tx) => {
    const candidates = await tx.guestAttempt.findMany({
      where: { guestId, claimedByUserId: null },
      select: { id: true },
    });

    if (candidates.length === 0) {
      return { claimedCount: 0, xpAwarded: 0 };
    }

    const ids = candidates.map((row) => row.id);

    const claimResult = await tx.guestAttempt.updateMany({
      where: { id: { in: ids }, claimedByUserId: null },
      data: { claimedByUserId: userId, claimedAt: now },
    });

    if (claimResult.count === 0) {
      return { claimedCount: 0, xpAwarded: 0 };
    }

    // Only rows this call actually won the claim on (see the updateMany's
    // claimedByUserId: null scoping) are eligible to be credited below.
    const claimedRows = await tx.guestAttempt.findMany({
      where: { id: { in: ids }, claimedByUserId: userId },
      select: { id: true, gameKey: true, date: true, challengeId: true, isCorrect: true, xpEarned: true },
    });

    let xpAwarded = 0;
    for (const row of claimedRows) {
      const existingForDay = await tx.userDailyAttempt.findUnique({
        where: { userId_gameKey_date: { userId, gameKey: row.gameKey, date: row.date } },
      });

      if (existingForDay) continue;

      await tx.userDailyAttempt.create({
        data: {
          userId,
          gameKey: row.gameKey,
          date: row.date,
          challengeId: row.challengeId,
          guestAttemptId: row.id,
          isCorrect: row.isCorrect,
          xpEarned: row.xpEarned,
        },
      });
      xpAwarded += row.xpEarned;
    }

    const previousUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { level: true, subscriptionStatus: true, premiumUntil: true },
    });

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: xpAwarded } },
      select: { xp: true },
    });

    // Mirrors /api/daily-challenge/submit and /api/quiz/submit: this runs
    // for any already-authenticated user claiming guest attempts (not just
    // at signup -- see the [gameKey]/submit and claim routes), so Pro
    // status has to be checked here too -- xp itself is never clamped.
    const trueLevel = calculateLevel(updatedUser.xp);
    const newLevel = isEffectivelyPro(previousUser, now)
      ? trueLevel
      : Math.min(trueLevel, FREE_LEVEL_CAP);
    if (newLevel !== previousUser.level) {
      await tx.user.update({ where: { id: userId }, data: { level: newLevel } });
    }

    await registerQuizActivity(tx, userId, now);

    return { claimedCount: claimedRows.length, xpAwarded };
  });
}
