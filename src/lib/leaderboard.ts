import { prisma } from "@/lib/db";

export const LEADERBOARD_PAGE_SIZE = 20;

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  /** Total XP for the global board, total correct answers for a topic board. */
  primaryValue: number;
  /** Level for the global board, quiz count for a topic board. */
  secondaryValue: number;
};

export type LeaderboardPage = {
  scope: "global" | "topic";
  topic: string | null;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
};

function clampPage(page: number): number {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

/**
 * Global leaderboard, ranked by total XP. `restrictToUserIds` is an
 * unexposed extension seam: today it's always undefined (everyone ranked
 * against everyone), but a future "friends" scope can filter to a specific
 * set of user IDs without changing this function's query shape or the
 * pagination/rank math below.
 */
export async function getGlobalLeaderboardPage(params: {
  userId: string;
  page?: number;
  pageSize?: number;
  restrictToUserIds?: string[];
}): Promise<LeaderboardPage> {
  const page = clampPage(params.page ?? 1);
  const pageSize = params.pageSize ?? LEADERBOARD_PAGE_SIZE;
  const scopeFilter = params.restrictToUserIds
    ? { id: { in: params.restrictToUserIds } }
    : {};

  const where = { xp: { gt: 0 }, ...scopeFilter };

  const [rows, totalCount, currentUser] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ xp: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, image: true, xp: true, level: true },
    }),
    prisma.user.count({ where }),
    prisma.user.findUnique({ where: { id: params.userId }, select: { xp: true } }),
  ]);

  const currentUserRank =
    currentUser && currentUser.xp > 0
      ? (await prisma.user.count({ where: { ...where, xp: { gt: currentUser.xp } } })) + 1
      : null;

  return {
    scope: "global",
    topic: null,
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    entries: rows.map((row, index) => ({
      rank: (page - 1) * pageSize + index + 1,
      userId: row.id,
      name: row.name ?? "Anonymous",
      image: row.image,
      primaryValue: row.xp,
      secondaryValue: row.level,
    })),
    currentUserRank,
  };
}

type TopicAggregateRow = {
  userId: string;
  name: string | null;
  image: string | null;
  correctAnswers: bigint | number;
  quizCount: bigint | number;
};

/**
 * Per-topic leaderboard. XP isn't tracked per category, so this ranks by
 * total correct answers within the topic instead (an ever-growing, "more
 * play = higher rank" metric, matching the spirit of the global XP board
 * rather than a one-shot accuracy percentage that rewards playing once and
 * stopping). Aggregation happens in Postgres via raw SQL -- Prisma's
 * groupBy() can't group across a joined relation (Attempt -> Game.topic) in
 * one query, and pulling every attempt into JS to sum in memory would not
 * scale.
 */
export async function getTopicLeaderboardPage(params: {
  topic: string;
  userId: string;
  page?: number;
  pageSize?: number;
}): Promise<LeaderboardPage> {
  const page = clampPage(params.page ?? 1);
  const pageSize = params.pageSize ?? LEADERBOARD_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const { topic, userId } = params;

  const [rows, totalCountRows, rankRows] = await Promise.all([
    prisma.$queryRaw<TopicAggregateRow[]>`
      SELECT a."userId" AS "userId",
             u.name AS name,
             u.image AS image,
             SUM(a."correctAnswers")::int AS "correctAnswers",
             COUNT(*)::int AS "quizCount"
      FROM "Attempt" a
      JOIN "Game" g ON g.id = a."gameId"
      JOIN "User" u ON u.id = a."userId"
      WHERE g.topic = ${topic}
      GROUP BY a."userId", u.name, u.image
      ORDER BY SUM(a."correctAnswers") DESC, a."userId" ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(DISTINCT a."userId")::int AS count
      FROM "Attempt" a
      JOIN "Game" g ON g.id = a."gameId"
      JOIN "User" u ON u.id = a."userId"
      WHERE g.topic = ${topic}
    `,
    prisma.$queryRaw<Array<{ rank: bigint | number | null }>>`
      WITH totals AS (
        SELECT a."userId" AS "userId", SUM(a."correctAnswers") AS total_correct
        FROM "Attempt" a
        JOIN "Game" g ON g.id = a."gameId"
        JOIN "User" u ON u.id = a."userId"
        WHERE g.topic = ${topic}
        GROUP BY a."userId"
      ),
      me AS (
        SELECT total_correct FROM totals WHERE "userId" = ${userId}
      )
      SELECT
        (CASE
          WHEN (SELECT total_correct FROM me) IS NULL THEN NULL
          ELSE (
            (SELECT COUNT(*) FROM totals WHERE total_correct > (SELECT total_correct FROM me)) + 1
          )
        END)::int AS rank
    `,
  ]);

  const totalCount = Number(totalCountRows[0]?.count ?? 0);
  const currentUserRankValue = rankRows[0]?.rank;

  return {
    scope: "topic",
    topic,
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    entries: rows.map((row, index) => ({
      rank: offset + index + 1,
      userId: row.userId,
      name: row.name ?? "Anonymous",
      image: row.image,
      primaryValue: Number(row.correctAnswers),
      secondaryValue: Number(row.quizCount),
    })),
    currentUserRank: currentUserRankValue != null ? Number(currentUserRankValue) : null,
  };
}

/** Distinct topics with at least one completed attempt, most-played first -- powers the leaderboard's category filter. */
export async function getLeaderboardTopics(limit = 20): Promise<Array<{ topic: string; players: number }>> {
  const rows = await prisma.$queryRaw<Array<{ topic: string; players: bigint | number }>>`
    SELECT g.topic AS topic, COUNT(DISTINCT a."userId")::int AS players
    FROM "Attempt" a
    JOIN "Game" g ON g.id = a."gameId"
    JOIN "User" u ON u.id = a."userId"
    WHERE g.topic NOT IN ('', 'Practice Mistakes')
    GROUP BY g.topic
    ORDER BY players DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({ topic: row.topic, players: Number(row.players) }));
}

/** Lean helper for dashboard teasers that only need the rank, not a full page. */
export async function getUserGlobalRank(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
  if (!user || user.xp <= 0) return null;

  const higherCount = await prisma.user.count({ where: { xp: { gt: user.xp } } });
  return higherCount + 1;
}
