import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Trophy } from "lucide-react";

import LeaderboardTable from "@/components/LeaderboardTable";
import { getAuthSession } from "@/lib/nextauth";
import { getGlobalLeaderboardPage, getLeaderboardTopics } from "@/lib/leaderboard";
import { getFriendsOverview } from "@/lib/friends";

export const metadata = {
  title: "Leaderboard | Quizmify",
  description: "See how you stack up against everyone else.",
};

export default async function LeaderboardPage() {
  const session = await getAuthSession();
  const t = await getTranslations("Leaderboard");

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [initialData, topics, friendsOverview] = await Promise.all([
    getGlobalLeaderboardPage({ userId: session.user.id }),
    getLeaderboardTopics(),
    getFriendsOverview(session.user.id),
  ]);

  const friendUserIds = friendsOverview.friends.map((f) => f.userId);
  const pendingUserIds = friendsOverview.outgoingRequests.map((r) => r.userId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
          <Trophy className="h-3.5 w-3.5" />
          {t("badge")}
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {t("title")}
        </h1>
      </div>

      <LeaderboardTable
        initialData={initialData}
        topics={topics}
        currentUserId={session.user.id}
        friendUserIds={friendUserIds}
        pendingUserIds={pendingUserIds}
      />
    </div>
  );
}
