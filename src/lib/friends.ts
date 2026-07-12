import { prisma } from "@/lib/db";
import { getEffectiveStreak } from "@/lib/streak";

/** Every accepted friend's user ID, from either side of the relation. */
export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  return rows.map((row) => (row.requesterId === userId ? row.addresseeId : row.requesterId));
}

export type FriendSummary = {
  friendshipId: string;
  userId: string;
  name: string;
  image: string | null;
  xp: number;
  level: number;
  currentStreak: number;
};

export type FriendRequestSummary = {
  friendshipId: string;
  userId: string;
  name: string;
  image: string | null;
};

export type FriendsOverview = {
  friends: FriendSummary[];
  incomingRequests: FriendRequestSummary[];
  outgoingRequests: FriendRequestSummary[];
};

/** Shared by the /api/friends GET route and the /friends page's SSR fetch. */
export async function getFriendsOverview(userId: string): Promise<FriendsOverview> {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: {
        select: { id: true, name: true, image: true, xp: true, level: true, currentStreak: true, lastQuizDate: true },
      },
      addressee: {
        select: { id: true, name: true, image: true, xp: true, level: true, currentStreak: true, lastQuizDate: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const overview: FriendsOverview = { friends: [], incomingRequests: [], outgoingRequests: [] };

  for (const f of friendships) {
    const isRequester = f.requesterId === userId;
    const other = isRequester ? f.addressee : f.requester;

    if (f.status === "accepted") {
      overview.friends.push({
        friendshipId: f.id,
        userId: other.id,
        name: other.name ?? "Anonymous",
        image: other.image,
        xp: other.xp,
        level: other.level,
        currentStreak: getEffectiveStreak(other),
      });
    } else if (isRequester) {
      overview.outgoingRequests.push({
        friendshipId: f.id,
        userId: other.id,
        name: other.name ?? "Anonymous",
        image: other.image,
      });
    } else {
      overview.incomingRequests.push({
        friendshipId: f.id,
        userId: other.id,
        name: other.name ?? "Anonymous",
        image: other.image,
      });
    }
  }

  overview.friends.sort((a, b) => b.xp - a.xp);

  return overview;
}

export type FriendRequestOutcome = "created" | "auto_accepted" | "already_pending" | "already_friends";

/**
 * Sends a friend request from `fromUserId` to `toUserId`. If `toUserId` had
 * already sent a pending request the other way, this accepts it instead of
 * creating a redundant second row -- so two people adding each other at
 * roughly the same time just become friends immediately rather than being
 * stuck with two crossed pending requests.
 */
export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<FriendRequestOutcome> {
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: fromUserId, addresseeId: toUserId },
        { requesterId: toUserId, addresseeId: fromUserId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "accepted") return "already_friends";

    if (existing.requesterId === fromUserId) return "already_pending";

    // The other user already requested us -- accept it now instead of
    // leaving two crossed pending rows.
    await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: "accepted", respondedAt: new Date() },
    });
    return "auto_accepted";
  }

  await prisma.friendship.create({
    data: { requesterId: fromUserId, addresseeId: toUserId },
  });
  return "created";
}
