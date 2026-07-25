import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";

import { getAuthSession } from "@/lib/nextauth";
import { getFriendsOverview } from "@/lib/friends";
import { getSiteUrl } from "@/lib/site";
import FriendsManager from "@/components/FriendsManager";

export const metadata = {
  title: "Friends | Quizmify",
  description: "Compare progress with your friends.",
};

export default async function FriendsPage() {
  const session = await getAuthSession();
  const t = await getTranslations("Friends");

  if (!session?.user?.id) {
    redirect("/login");
  }

  const overview = await getFriendsOverview(session.user.id);
  const appUrl = getSiteUrl();
  const inviteLink = `${appUrl}/friends/add/${session.user.id}`;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
          <Users className="h-3.5 w-3.5" />
          {t("badge")}
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {t("title")}
        </h1>
      </div>

      <FriendsManager initialOverview={overview} inviteLink={inviteLink} currentUserId={session.user.id} />
    </div>
  );
}
