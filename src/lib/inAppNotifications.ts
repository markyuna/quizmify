import { prisma } from "@/lib/db";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { InAppNotificationType } from "@/generated/prisma/client";

type Client = Prisma.TransactionClient | PrismaClient;

export type NotificationListItem = {
  id: string;
  type: InAppNotificationType;
  actorId: string;
  actorName: string;
  actorImage: string | null;
  friendshipId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsPage = {
  notifications: NotificationListItem[];
  // Server clock at query time -- same "don't trust the client's clock"
  // reasoning as FriendsOverview.serverNow in src/lib/friends.ts.
  serverNow: string;
};

/**
 * Upserts a friend_request_received notification for `userId` (the
 * recipient), triggered by `actorId` (the requester). Write helpers here
 * take an optional tx client (defaulting to the plain `prisma` singleton)
 * rather than requiring one like streak.ts/neurons.ts/premium.ts do --
 * those are only ever called from inside a known transaction, these are
 * meant to also work standalone if a future caller needs that.
 *
 * @@unique([userId, actorId, type]) means a repeat request after a prior
 * decline/cancel refreshes this same row back to unread (readAt: null,
 * createdAt: now) instead of creating a duplicate -- see the comment on
 * InAppNotification in prisma/schema.prisma.
 */
export async function upsertFriendRequestReceived(
  params: { userId: string; actorId: string; friendshipId: string },
  client: Client = prisma
): Promise<void> {
  const { userId, actorId, friendshipId } = params;
  await client.inAppNotification.upsert({
    where: { userId_actorId_type: { userId, actorId, type: InAppNotificationType.friend_request_received } },
    create: { userId, actorId, type: InAppNotificationType.friend_request_received, friendshipId },
    update: { readAt: null, createdAt: new Date(), friendshipId },
  });
}

/**
 * Upserts a friend_request_accepted notification for `userId` (the original
 * requester), triggered by `actorId` (whoever's action completed the
 * acceptance -- the addressee on a normal PATCH accept, or the auto-accepter
 * on sendFriendRequest's crossed-request path).
 */
export async function upsertFriendRequestAccepted(
  params: { userId: string; actorId: string; friendshipId: string },
  client: Client = prisma
): Promise<void> {
  const { userId, actorId, friendshipId } = params;
  await client.inAppNotification.upsert({
    where: { userId_actorId_type: { userId, actorId, type: InAppNotificationType.friend_request_accepted } },
    create: { userId, actorId, type: InAppNotificationType.friend_request_accepted, friendshipId },
    update: { readAt: null, createdAt: new Date(), friendshipId },
  });
}

/**
 * Deletes every friend_request_* notification between this pair of users,
 * in both directions and both types. Used on decline/cancel/unfriend --
 * covers both "wipe the now-stale pending request" and, when the pair were
 * already friends and one of them unfriends the other via the same DELETE
 * route, "wipe the now-stale accepted notification too" (both call sites use
 * the same endpoint, see src/app/api/friends/[friendshipId]/route.ts).
 */
export async function deleteFriendNotificationsBetween(
  userIdA: string,
  userIdB: string,
  client: Client = prisma
): Promise<void> {
  await client.inAppNotification.deleteMany({
    where: {
      type: { in: [InAppNotificationType.friend_request_received, InAppNotificationType.friend_request_accepted] },
      OR: [
        { userId: userIdA, actorId: userIdB },
        { userId: userIdB, actorId: userIdA },
      ],
    },
  });
}

/** Latest 20 notifications for `userId`, newest first, with the actor's current name/image. */
export async function listNotifications(userId: string): Promise<NotificationsPage> {
  const now = new Date();
  const rows = await prisma.inAppNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: { select: { name: true, image: true } } },
  });

  return {
    notifications: rows.map((row) => ({
      id: row.id,
      type: row.type,
      actorId: row.actorId,
      actorName: row.actor.name ?? "Anonymous",
      actorImage: row.actor.image,
      friendshipId: row.friendshipId,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    })),
    serverNow: now.toISOString(),
  };
}

/** Count of unread notifications for `userId`. */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.inAppNotification.count({ where: { userId, readAt: null } });
}

/** Marks every unread notification for `userId` as read. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.inAppNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
