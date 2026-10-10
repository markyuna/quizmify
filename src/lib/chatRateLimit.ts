import { prisma } from "@/lib/db";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Client = Prisma.TransactionClient | PrismaClient;

/**
 * Abuse limits for the friends chat and friend requests, counted from DB
 * rows on every call -- no in-memory state, since serverless invocations
 * share none. Count-then-write: two requests racing at the exact limit can
 * both pass, so these are soft caps against spam, not exact quotas.
 */
export const CHAT_MESSAGES_PER_MINUTE = 20;
export const FRIEND_REQUESTS_PER_DAY = 20;
export const MAX_PENDING_OUTGOING_FRIEND_REQUESTS = 50;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ChatMessageRateLimit = { allowed: true } | { allowed: false; retryAfterMs: number };

/** Backed by @@index([senderId, createdAt]) on ChatMessage. */
export async function checkChatMessageRateLimit(
  senderId: string,
  client: Client = prisma
): Promise<ChatMessageRateLimit> {
  const now = Date.now();
  const recent = await client.chatMessage.findMany({
    where: { senderId, createdAt: { gt: new Date(now - MINUTE_MS) } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
    take: CHAT_MESSAGES_PER_MINUTE,
  });
  if (recent.length < CHAT_MESSAGES_PER_MINUTE) return { allowed: true };
  // The oldest message in the window is the next one to age out of it.
  return { allowed: false, retryAfterMs: Math.max(0, recent[0].createdAt.getTime() + MINUTE_MS - now) };
}

export type FriendRequestRateLimit =
  | { allowed: true }
  | { allowed: false; reason: "rate_limited" | "too_many_pending" };

/**
 * Counts the Friendship rows `userId` created. Known gap: declining,
 * cancelling or unfriending DELETES the row (/api/friends/[friendshipId]),
 * so those requests stop counting -- a send-then-cancel loop slips past the
 * daily cap. Closing it needs an append-only request log (a schema change).
 */
export async function checkFriendRequestRateLimit(userId: string): Promise<FriendRequestRateLimit> {
  const since = new Date(Date.now() - DAY_MS);
  const [sentToday, pendingOutgoing] = await Promise.all([
    prisma.friendship.count({ where: { requesterId: userId, createdAt: { gt: since } } }),
    prisma.friendship.count({ where: { requesterId: userId, status: "pending" } }),
  ]);
  if (pendingOutgoing >= MAX_PENDING_OUTGOING_FRIEND_REQUESTS) return { allowed: false, reason: "too_many_pending" };
  if (sentToday >= FRIEND_REQUESTS_PER_DAY) return { allowed: false, reason: "rate_limited" };
  return { allowed: true };
}
