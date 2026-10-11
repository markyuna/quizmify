import { prisma } from "@/lib/db";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { formatPublicPlayerName } from "@/lib/community";
import { getAcceptedFriendIds } from "@/lib/friends";
import { deleteFriendNotificationsBetween } from "@/lib/inAppNotifications";
import { isOnline } from "@/lib/presence";
import { checkChatMessageRateLimit } from "@/lib/chatRateLimit";
import { getBlockDirection, getBlockedUserIds } from "@/lib/userBlocks";

export { isBlockedEitherWay } from "@/lib/userBlocks";

type Client = Prisma.TransactionClient | PrismaClient;

// Mirrors @db.VarChar(1000) on ChatMessage.body.
export const CHAT_MESSAGE_MAX_LENGTH = 1000;
export const CHAT_MESSAGES_PAGE_SIZE = 30;
export const CHAT_CONTACTS_PAGE_SIZE = 20;
const CHAT_CONTACTS_MAX_PAGE = 500;

/**
 * The only part of a search query that may filter non-friends: its first
 * word, minus the LIKE metacharacters % _ and \ (Prisma passes them
 * through to ILIKE unescaped, and % / _ can match the space between first
 * name and surname). Returns "" when nothing searchable is left, meaning
 * "no name filter".
 */
function nonFriendNamePrefix(query: string): string {
  const firstWord = query.trim().split(/\s+/)[0] ?? "";
  return firstWord.replace(/[%_\\]/g, "");
}

export const CHAT_REPORT_REASONS = ["spam", "harassment", "inappropriate", "other"] as const;
export type ChatReportReason = (typeof CHAT_REPORT_REASONS)[number];

/** userAId is always the lexicographically smaller id -- see ChatConversation in prisma/schema.prisma. */
export function orderedUserPair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export function conversationSide(conversation: { userAId: string; userBId: string }, userId: string): "A" | "B" {
  if (conversation.userAId === userId) return "A";
  if (conversation.userBId === userId) return "B";
  throw new Error("User is not a participant of this conversation");
}

export async function areFriends(userId: string, otherId: string, client: Client = prisma): Promise<boolean> {
  const friendship = await client.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: userId },
      ],
    },
    select: { id: true },
  });
  return friendship !== null;
}

/**
 * Re-checked on every chat read and send -- access is never stored. A block
 * deletes the friendship, so from the blocked side a block looks exactly
 * like an unfriend; the routes keep it that way by reporting
 * "blocked_by_them" as NOT_FRIENDS (see chatAccessError in chatApi.ts).
 * Sequential awaits on purpose: this also runs on a transaction client.
 */
export type ChatAccess = "ok" | "not_friends" | "blocked_by_me" | "blocked_by_them";

export async function canChat(userId: string, otherId: string, client: Client = prisma): Promise<ChatAccess> {
  if (userId === otherId) return "not_friends";
  const block = await getBlockDirection(userId, otherId, client);
  if (block === "by_me") return "blocked_by_me";
  if (block === "by_them") return "blocked_by_them";
  return (await areFriends(userId, otherId, client)) ? "ok" : "not_friends";
}

/** Upsert on the pair's unique index, so two racing first messages can't create two rows. */
export async function getOrCreateConversation(
  userId: string,
  otherId: string,
  client: Client
): Promise<{ id: string; userAId: string; userBId: string }> {
  const pair = orderedUserPair(userId, otherId);
  return client.chatConversation.upsert({
    where: { userAId_userBId: pair },
    create: pair,
    update: {},
    select: { id: true, userAId: true, userBId: true },
  });
}

export type ChatMessageItem = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

function toMessageItem(
  row: { id: string; senderId: string; body: string; createdAt: Date },
  viewerId: string
): ChatMessageItem {
  return {
    id: row.id,
    senderId: row.senderId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    mine: row.senderId === viewerId,
  };
}

export type SendChatMessageResult =
  | { ok: true; message: ChatMessageItem }
  | { ok: false; reason: Exclude<ChatAccess, "ok"> }
  | { ok: false; reason: "rate_limited"; retryAfterMs: number };

/** `body` must already be trimmed and length-checked by the route's Zod schema. */
export async function sendChatMessage(
  senderId: string,
  recipientId: string,
  body: string
): Promise<SendChatMessageResult> {
  return prisma.$transaction(async (tx): Promise<SendChatMessageResult> => {
    const access = await canChat(senderId, recipientId, tx);
    if (access !== "ok") return { ok: false, reason: access };

    const limit = await checkChatMessageRateLimit(senderId, tx);
    if (!limit.allowed) return { ok: false, reason: "rate_limited", retryAfterMs: limit.retryAfterMs };

    const conversation = await getOrCreateConversation(senderId, recipientId, tx);
    const message = await tx.chatMessage.create({
      data: { conversationId: conversation.id, senderId, body },
      select: { id: true, senderId: true, body: true, createdAt: true },
    });
    // Sending implies having read everything up to your own message.
    const readField = conversationSide(conversation, senderId) === "A" ? "userALastReadAt" : "userBLastReadAt";
    await tx.chatConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: message.createdAt, [readField]: message.createdAt },
    });

    return { ok: true, message: toMessageItem(message, senderId) };
  });
}

export type ChatMessagesPage = {
  // Chronological (oldest first) within the page.
  messages: ChatMessageItem[];
  hasMore: boolean;
  // Pass back as `before` to load the previous page; null when !hasMore.
  nextBefore: string | null;
  serverNow: string;
  // When the other participant last opened the conversation (ISO), or null if
  // never: my messages up to that instant are "read". Never the viewer's own.
  otherLastReadAt: string | null;
};

/** Caller must have checked canChat() first. */
export async function listChatMessages(
  userId: string,
  otherId: string,
  opts: { before?: string; limit?: number } = {}
): Promise<ChatMessagesPage> {
  const serverNow = new Date().toISOString();
  const empty: ChatMessagesPage = { messages: [], hasMore: false, nextBefore: null, serverNow, otherLastReadAt: null };
  const limit = Math.min(Math.max(opts.limit ?? CHAT_MESSAGES_PAGE_SIZE, 1), 100);

  const conversation = await prisma.chatConversation.findUnique({
    where: { userAId_userBId: orderedUserPair(userId, otherId) },
    select: { id: true, userAId: true, userBId: true, userALastReadAt: true, userBLastReadAt: true },
  });
  if (!conversation) return empty;
  const otherLastRead =
    conversationSide(conversation, userId) === "A" ? conversation.userBLastReadAt : conversation.userALastReadAt;
  const otherLastReadAt = otherLastRead?.toISOString() ?? null;

  // Resolve the cursor inside THIS conversation, so an id from another
  // conversation is just "not found" rather than a pagination anchor.
  let cursor: { id: string; createdAt: Date } | null = null;
  if (opts.before) {
    cursor = await prisma.chatMessage.findFirst({
      where: { id: opts.before, conversationId: conversation.id },
      select: { id: true, createdAt: true },
    });
    if (!cursor) return { ...empty, otherLastReadAt };
  }

  const rows = await prisma.chatMessage.findMany({
    where: {
      conversationId: conversation.id,
      deletedAt: null,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: { id: true, senderId: true, body: true, createdAt: true },
  });

  const hasMore = rows.length > limit;
  const page = (hasMore ? rows.slice(0, limit) : rows).reverse();
  return {
    messages: page.map((row) => toMessageItem(row, userId)),
    hasMore,
    nextBefore: hasMore ? page[0].id : null,
    serverNow,
    otherLastReadAt,
  };
}

/** No-op when the pair has never exchanged a message. Caller must have checked canChat() first. */
export async function markConversationRead(userId: string, otherId: string): Promise<void> {
  const pair = orderedUserPair(userId, otherId);
  const now = new Date();
  await prisma.chatConversation.updateMany({
    where: pair,
    data: pair.userAId === userId ? { userALastReadAt: now } : { userBLastReadAt: now },
  });
}

/**
 * Unread messages per counterpart: messages from the other side, newer than
 * the viewer's read cursor. One grouped query over the viewer's
 * conversations (both userAId/userBId indexes), joined through
 * @@index([conversationId, createdAt]).
 */
async function getUnreadByOtherUser(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ otherUserId: string; unread: bigint | number }>>`
    SELECT CASE WHEN c."userAId" = ${userId} THEN c."userBId" ELSE c."userAId" END AS "otherUserId",
           COUNT(m.id) AS unread
    FROM "ChatConversation" c
    JOIN "ChatMessage" m ON m."conversationId" = c.id
    WHERE (c."userAId" = ${userId} OR c."userBId" = ${userId})
      AND m."senderId" <> ${userId}
      AND m."deletedAt" IS NULL
      AND m."createdAt" > COALESCE(
        CASE WHEN c."userAId" = ${userId} THEN c."userALastReadAt" ELSE c."userBLastReadAt" END,
        '-infinity'::timestamp
      )
    GROUP BY 1
  `;
  return new Map(rows.map((row) => [row.otherUserId, Number(row.unread)]));
}

/**
 * Total for the chat bubble's badge. Only counts conversations the viewer
 * can still open (current friends) -- an ex-friend's or blocked user's
 * unread messages must not keep the badge lit with nothing to click.
 */
export async function getChatUnreadCount(userId: string): Promise<number> {
  const [unread, friendIds] = await Promise.all([getUnreadByOtherUser(userId), getAcceptedFriendIds(userId)]);
  return friendIds.reduce((sum, friendId) => sum + (unread.get(friendId) ?? 0), 0);
}

export type ChatFriendContact = {
  userId: string;
  // Full account name, as on /friends -- friends already know each other.
  name: string | null;
  image: string | null;
  online: boolean;
  lastSeenAt: string | null;
  unread: number;
};

export type ChatOtherContact = {
  userId: string;
  // formatPublicPlayerName(): never the full name.
  name: string | null;
  image: string | null;
  relation: "none" | "pending_sent" | "pending_received";
  // Set for pending_*, so the UI can cancel/accept via /api/friends/[friendshipId].
  friendshipId: string | null;
};

export type ChatContactsPage = {
  // Page 1 only: every friend (search-filtered), online first.
  friends: ChatFriendContact[];
  others: ChatOtherContact[];
  page: number;
  hasMore: boolean;
  serverNow: string;
};

/**
 * The chat panel's user list. Friends come whole on page 1 (a friend list
 * is small); everyone else pages with the same take(PAGE_SIZE + 1) / no
 * count() pattern as getProOfferCandidates, ordered xp desc / id asc. Rows
 * can shift between pages while XP moves -- the client dedupes on flatten,
 * as InviteToProCard does.
 *
 * Search differs by group on purpose. Friends match the full query against
 * their full name (in memory). Non-friends only ever match the query's
 * FIRST word, as a case-insensitive prefix of their name: the list shows a
 * non-friend as formatPublicPlayerName() ("Marcos S."), and matching the
 * whole query against the full name would let anyone confirm a stranger's
 * surname by typing "Marcos Suárez" and watching the result appear.
 * That first word is also stripped of % _ \ (nonFriendNamePrefix): they're
 * LIKE wildcards, and "Marcos_S" or "M%z" would otherwise cross the space
 * and probe the surname all the same.
 *
 * Non-friends: lastSeenAt is never selected, chatDiscoverable = false hides
 * them, and accounts with no usable public name (null or email-like, see
 * formatPublicPlayerName) are left out. Blocks either way hide both groups.
 */
export async function listChatContacts(
  userId: string,
  opts: { query?: string; page?: number } = {}
): Promise<ChatContactsPage> {
  const now = new Date();
  const query = opts.query?.trim() ?? "";
  const namePrefix = nonFriendNamePrefix(query);
  const page = Math.min(Math.max(opts.page ?? 1, 1), CHAT_CONTACTS_MAX_PAGE);

  const [accepted, pending, blockedIds] = await Promise.all([
    prisma.friendship.findMany({
      where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: {
        requesterId: true,
        requester: { select: { id: true, name: true, image: true, lastSeenAt: true } },
        addressee: { select: { id: true, name: true, image: true, lastSeenAt: true } },
      },
    }),
    // Ids only: pending counterparts are non-friends, so no profile/presence here.
    prisma.friendship.findMany({
      where: { status: "pending", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { id: true, requesterId: true, addresseeId: true },
    }),
    getBlockedUserIds(userId),
  ]);

  const friendProfiles = accepted.map((f) => (f.requesterId === userId ? f.addressee : f.requester));
  const friendIds = friendProfiles.map((friend) => friend.id);

  let friends: ChatFriendContact[] = [];
  if (page === 1) {
    const unread = await getUnreadByOtherUser(userId);
    const needle = query.toLocaleLowerCase();
    friends = friendProfiles
      .filter((friend) => !needle || (friend.name ?? "").toLocaleLowerCase().includes(needle))
      .map((friend) => ({
        userId: friend.id,
        name: friend.name,
        image: friend.image,
        online: isOnline(friend.lastSeenAt, now),
        lastSeenAt: friend.lastSeenAt ? friend.lastSeenAt.toISOString() : null,
        unread: unread.get(friend.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          Number(b.online) - Number(a.online) ||
          (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? "") ||
          (a.name ?? "").localeCompare(b.name ?? "")
      );
  }

  const rows = await prisma.user.findMany({
    where: {
      id: { notIn: [userId, ...friendIds, ...blockedIds] },
      chatDiscoverable: true,
      AND: [
        { name: { not: null } },
        { NOT: { name: { contains: "@" } } },
        ...(namePrefix ? [{ name: { startsWith: namePrefix, mode: "insensitive" as const } }] : []),
      ],
    },
    orderBy: [{ xp: "desc" }, { id: "asc" }],
    skip: (page - 1) * CHAT_CONTACTS_PAGE_SIZE,
    take: CHAT_CONTACTS_PAGE_SIZE + 1,
    select: { id: true, name: true, image: true },
  });

  const hasMore = rows.length > CHAT_CONTACTS_PAGE_SIZE;
  const pendingByUser = new Map(
    pending.map((f) => [
      f.requesterId === userId ? f.addresseeId : f.requesterId,
      { friendshipId: f.id, sentByMe: f.requesterId === userId },
    ])
  );

  const others: ChatOtherContact[] = (hasMore ? rows.slice(0, CHAT_CONTACTS_PAGE_SIZE) : rows).map((row) => {
    const pendingRequest = pendingByUser.get(row.id);
    return {
      userId: row.id,
      name: formatPublicPlayerName(row.name),
      image: row.image,
      relation: pendingRequest ? (pendingRequest.sentByMe ? "pending_sent" : "pending_received") : "none",
      friendshipId: pendingRequest?.friendshipId ?? null,
    };
  });

  return { friends, others, page, hasMore, serverNow: now.toISOString() };
}

/**
 * One transaction: the block, the pair's Friendship row (any status -- an
 * accepted friendship or a pending request either way) and their
 * friend_request_* bell notifications. Idempotent. The conversation is kept
 * (history survives an unblock + re-friend) but canChat() closes it.
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    await tx.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: blockerId, addresseeId: blockedId },
          { requesterId: blockedId, addresseeId: blockerId },
        ],
      },
    });
    await deleteFriendNotificationsBetween(blockerId, blockedId, tx);
  });
}

/** Lifts only the caller's own block; never restores the friendship. Idempotent. */
export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
}

export type ChatReportDetails = {
  reportId: string;
  reason: ChatReportReason;
  bodySnapshot: string;
  messageId: string;
  messageCreatedAt: string;
  reporterId: string;
  reportedUserId: string;
};

export type ChatReportOutcome =
  | { outcome: "created"; report: ChatReportDetails }
  | { outcome: "already_reported" }
  | { outcome: "not_found" }
  | { outcome: "own_message" };

/**
 * Doesn't require a current friendship (block-then-report is the normal
 * flow), only that the reporter is a participant. "Doesn't exist" and "not
 * your conversation" share not_found so message ids can't be probed.
 */
export async function reportChatMessage(
  reporterId: string,
  messageId: string,
  reason: ChatReportReason
): Promise<ChatReportOutcome> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      body: true,
      senderId: true,
      createdAt: true,
      deletedAt: true,
      conversation: { select: { userAId: true, userBId: true } },
    },
  });
  if (!message || message.deletedAt) return { outcome: "not_found" };
  const { userAId, userBId } = message.conversation;
  if (reporterId !== userAId && reporterId !== userBId) return { outcome: "not_found" };
  if (message.senderId === reporterId) return { outcome: "own_message" };

  try {
    const report = await prisma.chatMessageReport.create({
      data: { messageId, reporterId, reason, bodySnapshot: message.body },
      select: { id: true },
    });
    return {
      outcome: "created",
      report: {
        reportId: report.id,
        reason,
        bodySnapshot: message.body,
        messageId,
        messageCreatedAt: message.createdAt.toISOString(),
        reporterId,
        reportedUserId: message.senderId,
      },
    };
  } catch (error) {
    // @@unique([messageId, reporterId]) -- same P2002 idiom as proOffers.ts.
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return { outcome: "already_reported" };
    }
    throw error;
  }
}
