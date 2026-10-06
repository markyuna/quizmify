import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowRight, Gift, Radio, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  COMMUNITY_MIN_DISPLAY_COUNT,
  getCommunityStats,
  getOnlineFriendsSummary,
  getRecentCommunityActivity,
  type CommunityActivityItem,
  type CommunityStats,
  type OnlineFriendsSummary,
} from "@/lib/community";
import CommunityActivityTicker from "@/components/home/CommunityActivityTicker";

/**
 * Homepage "live community" band. Every visitor sees anonymous aggregates
 * and a ticker of recent games (both cached globally, see getCommunityStats
 * / getRecentCommunityActivity); signed-in users additionally see their own
 * online friends, or an invitation to /referrals when they have none. The
 * ticker is the only place identities of non-friends appear, and only as a
 * shortened "First L." name for users who left showInCommunityFeed on.
 *
 * Both reads are best-effort -- a failing stats/friends query hides its own
 * block rather than taking the homepage down (same stance as the Hero's
 * popular-topics fetch in page.tsx). No polling: this is a render-time
 * snapshot, so it never adds per-visitor requests after the page loads.
 */
export default async function CommunitySection({ userId }: { userId: string | null }) {
  const t = await getTranslations("CommunitySection");
  const format = await getFormatter();

  const [stats, activity, friends] = await Promise.all([
    getCommunityStats().catch((error: unknown): CommunityStats | null => {
      console.error("Failed to fetch community stats:", error);
      return null;
    }),
    getRecentCommunityActivity().catch((error: unknown): CommunityActivityItem[] => {
      console.error("Failed to fetch community activity:", error);
      return [];
    }),
    userId
      ? getOnlineFriendsSummary(userId).catch((error: unknown): OnlineFriendsSummary | null => {
          console.error("Failed to fetch online friends:", error);
          return null;
        })
      : Promise.resolve(null),
  ]);

  const tiles = stats
    ? [
        { key: "playersToday", count: stats.playersToday },
        { key: "gamesToday", count: stats.gamesToday },
        { key: "gamesLastHour", count: stats.gamesLastHour },
      ].filter((tile) => tile.count >= COMMUNITY_MIN_DISPLAY_COUNT)
    : [];

  return (
    <section className="px-4 pt-8 md:px-8" aria-labelledby="community-heading">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h2 id="community-heading" className="text-lg font-bold text-slate-900 dark:text-white md:text-xl">
              {t("title")}
            </h2>
          </div>

          {tiles.length > 0 ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {tiles.map((tile) => (
                <div
                  key={tile.key}
                  className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                >
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(`${tile.key}Label`)}</dt>
                  <dd className="mt-1 text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                    {format.number(tile.count)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Radio className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
              {t("quietFallback")}
            </p>
          )}

          {/* Same small-number guard as the figures: a near-empty ticker
              reads as an empty room. */}
          {activity.length >= COMMUNITY_MIN_DISPLAY_COUNT && <CommunityActivityTicker items={activity} />}

          {friends && <FriendsBlock friends={friends} />}
        </div>
      </div>
    </section>
  );
}

async function FriendsBlock({ friends }: { friends: OnlineFriendsSummary }) {
  const t = await getTranslations("CommunitySection");

  if (friends.friendCount === 0) {
    return (
      <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10 sm:flex-row sm:items-center">
        <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Gift className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          {t("noFriends")}
        </p>
        <Link
          href="/referrals"
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-fuchsia-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition-opacity hover:opacity-90"
        >
          {t("inviteFriends")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const hiddenCount = friends.onlineCount - friends.online.length;

  return (
    <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        {friends.online.length > 0 ? (
          <ul className="flex -space-x-2" aria-label={t("friendsOnline", { count: friends.onlineCount })}>
            {friends.online.map((friend) => (
              <li key={friend.userId} className="relative">
                <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-900">
                  {friend.image && <AvatarImage src={friend.image} alt={friend.name} />}
                  <AvatarFallback>{friend.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900"
                />
              </li>
            ))}
            {hiddenCount > 0 && (
              <li className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-bold text-slate-600 dark:border-slate-900 dark:bg-slate-800 dark:text-slate-300">
                +{hiddenCount}
              </li>
            )}
          </ul>
        ) : (
          <Users className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
        )}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {friends.onlineCount > 0 ? t("friendsOnline", { count: friends.onlineCount }) : t("noFriendsOnline")}
        </p>
      </div>
      <Link
        href="/friends"
        className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-opacity hover:opacity-90"
      >
        {t("viewFriends")}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
