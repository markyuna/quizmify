import { prisma } from "@/lib/db";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { InAppNotificationType } from "@/generated/prisma/client";
import { grantPremiumDays } from "@/lib/premium";
import { LEADERBOARD_PAGE_SIZE } from "@/lib/leaderboard";
import { PRO_OFFER_DAILY_LIMIT, PRO_OFFER_REWARD_DAYS } from "@/lib/proOfferConstants";

type Client = Prisma.TransactionClient | PrismaClient;

export type OfferState = "invitable" | "invited" | "unavailable";

export type ProOfferCandidate = {
  userId: string;
  name: string;
  image: string | null;
  level: number;
  xp: number;
  state: OfferState;
};

export type ProOfferCandidatesResponse = {
  candidates: ProOfferCandidate[];
  page: number;
  // take(pageSize + 1) lets us tell "is there a next page" from the extra
  // row alone, with no separate count() query.
  hasMore: boolean;
  // Distinct from a per-row "unavailable" -- this is the one reason worth
  // surfacing at the page level (a banner), since it isn't about any
  // specific person. Per-row reasons (already referred, permanent Pro)
  // deliberately stay hidden, same stance as "invited" vs "unavailable".
  dailyLimitReached: boolean;
};

const MAX_CANDIDATE_PAGE = 50;

function clampCandidatePage(page: number): number {
  return Number.isFinite(page) && page >= 1 ? Math.min(Math.floor(page), MAX_CANDIDATE_PAGE) : 1;
}

/**
 * Computes each of `userIds`' invite state for `senderId`, in exactly 4
 * queries regardless of list size (Referral by referredId IN, this sender's
 * existing offers by userId IN, permanent-Pro by id IN, plus one count for
 * the daily cap) -- never N+1. "unavailable" deliberately collapses three
 * different reasons (already referred, permanent Pro, daily limit hit) into
 * one state so the UI can't be used to probe someone else's account status.
 */
export async function getOfferStatesForUsers(
  senderId: string,
  userIds: string[]
): Promise<{ states: Record<string, OfferState>; dailyLimitReached: boolean }> {
  if (userIds.length === 0) return { states: {}, dailyLimitReached: false };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [referredRows, existingOfferRows, permanentProRows, sentLast24h] = await Promise.all([
    prisma.referral.findMany({ where: { referredId: { in: userIds } }, select: { referredId: true } }),
    prisma.inAppNotification.findMany({
      where: { actorId: senderId, type: InAppNotificationType.referral_offer, userId: { in: userIds } },
      select: { userId: true },
    }),
    prisma.user.findMany({ where: { id: { in: userIds }, subscriptionStatus: "pro" }, select: { id: true } }),
    // Backed by @@index([actorId, type, createdAt]) from the Phase 2 schema.
    // Deliberately counts resolved (accepted/ignored) offers too, not just
    // pending ones -- an accepted offer still consumed one of today's 5
    // sends (see acceptProOffer's comment on why it keeps the row instead
    // of deleting it).
    prisma.inAppNotification.count({
      where: { actorId: senderId, type: InAppNotificationType.referral_offer, createdAt: { gte: since } },
    }),
  ]);

  const alreadyReferred = new Set(referredRows.map((r) => r.referredId));
  const alreadyInvited = new Set(existingOfferRows.map((r) => r.userId));
  const permanentPro = new Set(permanentProRows.map((r) => r.id));
  const dailyLimitReached = sentLast24h >= PRO_OFFER_DAILY_LIMIT;

  const states: Record<string, OfferState> = {};
  for (const id of userIds) {
    if (alreadyInvited.has(id)) states[id] = "invited";
    else if (alreadyReferred.has(id) || permanentPro.has(id) || dailyLimitReached) states[id] = "unavailable";
    else states[id] = "invitable";
  }

  return { states, dailyLimitReached };
}

/**
 * Paginated candidate list for the "Invite to Pro" card: the same shape
 * (xp > 0, ordered by xp desc/id asc) and page size as the global
 * leaderboard's row query in src/lib/leaderboard.ts -- deliberately NOT
 * calling getGlobalLeaderboardPage() itself, which also runs a count() and a
 * current-user-rank query this feature never needs. If the leaderboard's
 * sort ever changes, this must be updated to match.
 */
export async function getProOfferCandidates(senderId: string, page = 1): Promise<ProOfferCandidatesResponse> {
  const clampedPage = clampCandidatePage(page);
  const skip = (clampedPage - 1) * LEADERBOARD_PAGE_SIZE;

  const rows = await prisma.user.findMany({
    where: { xp: { gt: 0 }, id: { not: senderId } },
    orderBy: [{ xp: "desc" }, { id: "asc" }],
    skip,
    take: LEADERBOARD_PAGE_SIZE + 1,
    select: { id: true, name: true, image: true, xp: true, level: true },
  });

  const hasMore = rows.length > LEADERBOARD_PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, LEADERBOARD_PAGE_SIZE) : rows;

  const userIds = pageRows.map((r) => r.id);
  const { states, dailyLimitReached } = await getOfferStatesForUsers(senderId, userIds);

  return {
    candidates: pageRows.map((r) => ({
      userId: r.id,
      name: r.name ?? "Anonymous",
      image: r.image,
      level: r.level,
      xp: r.xp,
      state: states[r.id],
    })),
    page: clampedPage,
    hasMore,
    dailyLimitReached,
  };
}

export type CreateProOfferOutcome = "created" | "already_invited";

/**
 * Plain create, not upsert -- @@unique([userId, actorId, type]) is the
 * actual "haven't I already invited this person" guard; a P2002 here means
 * exactly that. Optional tx client like inAppNotifications.ts's write
 * helpers, though every call site today passes none (this never needs to
 * share a transaction with anything else, unlike the friend-request writes).
 */
export async function createProOffer(
  params: { senderId: string; recipientId: string },
  client: Client = prisma
): Promise<CreateProOfferOutcome> {
  try {
    await client.inAppNotification.create({
      data: { userId: params.recipientId, actorId: params.senderId, type: InAppNotificationType.referral_offer },
    });
    return "created";
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return "already_invited";
    }
    throw error;
  }
}

/**
 * Upserts a referral_offer_accepted notification for the sender. "Upsert"
 * for consistency with upsertFriendRequestAccepted's shape, but in practice
 * this only ever inserts: Referral.referredId is unique per recipient for
 * life, so a given (sender, recipient) pair can only ever reach this code
 * path once, ever.
 */
async function upsertProOfferAccepted(
  params: { userId: string; actorId: string },
  client: Client = prisma
): Promise<void> {
  const { userId, actorId } = params;
  await client.inAppNotification.upsert({
    where: { userId_actorId_type: { userId, actorId, type: InAppNotificationType.referral_offer_accepted } },
    create: { userId, actorId, type: InAppNotificationType.referral_offer_accepted },
    update: { readAt: null, createdAt: new Date() },
  });
}

export type AcceptProOfferOutcome =
  | { outcome: "accepted"; rewardDays: number }
  | { outcome: "not_found" }
  | { outcome: "already_referred" };

/**
 * Accepts a referral_offer notification: creates the Referral row, grants
 * both sides the reward, notifies the sender, and resolves the offer --
 * all in one transaction. @@unique([Referral.referredId]) is BOTH the
 * eligibility guard (can't accept if already referred via a signup link)
 * AND the double-click guard (a second concurrent accept of the same offer
 * loses this same race) -- one constraint, no extra reads needed to check
 * either case up front, same stance as /api/referrals/claim.
 */
export async function acceptProOffer(notificationId: string, recipientUserId: string): Promise<AcceptProOfferOutcome> {
  const notification = await prisma.inAppNotification.findUnique({ where: { id: notificationId } });
  if (
    !notification ||
    notification.userId !== recipientUserId ||
    notification.type !== InAppNotificationType.referral_offer ||
    notification.dismissedAt !== null
  ) {
    return { outcome: "not_found" };
  }

  const senderId = notification.actorId;
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.referral.create({
        data: { referrerId: senderId, referredId: recipientUserId, rewardDays: PRO_OFFER_REWARD_DAYS },
      });
      await grantPremiumDays(tx, senderId, PRO_OFFER_REWARD_DAYS);
      await grantPremiumDays(tx, recipientUserId, PRO_OFFER_REWARD_DAYS);
      await upsertProOfferAccepted({ userId: senderId, actorId: recipientUserId }, tx);
      // Resolved, not deleted: dismissedAt marks it "handled" the same way
      // ignoreProOffer does, so it drops out of listNotifications (filtered
      // on dismissedAt: null) and out of the unread count (readAt set) --
      // but the row survives, which matters for two invariants: the daily
      // send count above (counts ALL referral_offer rows in the last 24h,
      // accepted or not) and @@unique([userId, actorId, type]), which must
      // keep blocking this exact sender from creating a second offer to
      // this exact recipient now that they're already referred.
      await tx.inAppNotification.update({
        where: { id: notificationId },
        data: { dismissedAt: now, readAt: now },
      });
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      // The transaction rolled back -- nothing was granted. Still resolve
      // the offer (updateMany, not update/delete: a concurrent winning
      // accept may have already resolved it, and this must stay a no-op
      // either way rather than throw on a missing row).
      await prisma.inAppNotification.updateMany({
        where: { id: notificationId },
        data: { dismissedAt: now, readAt: now },
      });
      return { outcome: "already_referred" };
    }
    throw error;
  }

  return { outcome: "accepted", rewardDays: PRO_OFFER_REWARD_DAYS };
}

export type IgnoreProOfferOutcome = "ignored" | "not_found";

/**
 * Marks a referral_offer as dismissed+read. Never deletes the row:
 * @@unique([userId, actorId, type]) only blocks a resend while the row still
 * exists, which is the point -- deleting it would let the same sender
 * immediately re-invite someone who just said no. The sender gets no
 * notification of an ignore, by design.
 */
export async function ignoreProOffer(notificationId: string, recipientUserId: string): Promise<IgnoreProOfferOutcome> {
  const now = new Date();
  const result = await prisma.inAppNotification.updateMany({
    where: { id: notificationId, userId: recipientUserId, type: InAppNotificationType.referral_offer },
    data: { dismissedAt: now, readAt: now },
  });
  return result.count > 0 ? "ignored" : "not_found";
}
