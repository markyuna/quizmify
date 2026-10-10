import { prisma } from "@/lib/db";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Client = Prisma.TransactionClient | PrismaClient;

/**
 * Block lookups, in their own leaf module (db only) so src/lib/friends.ts
 * and src/lib/chat.ts can both use them without an import cycle
 * (chat.ts -> community.ts -> friends.ts already exists).
 */

/** Which side blocked, from `userId`'s point of view; "by_me" wins when both did. */
export async function getBlockDirection(
  userId: string,
  otherId: string,
  client: Client = prisma
): Promise<"by_me" | "by_them" | null> {
  const blocks = await client.userBlock.findMany({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherId },
        { blockerId: otherId, blockedId: userId },
      ],
    },
    select: { blockerId: true },
  });
  if (blocks.length === 0) return null;
  return blocks.some((block) => block.blockerId === userId) ? "by_me" : "by_them";
}

export async function isBlockedEitherWay(userId: string, otherId: string, client: Client = prisma): Promise<boolean> {
  return (await getBlockDirection(userId, otherId, client)) !== null;
}

/** Every user id `userId` has blocked or been blocked by. */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return rows.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId));
}
