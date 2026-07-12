import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { getAcceptedFriendIds } from "@/lib/friends";

export default async function FriendsCard({ userId }: { userId: string }) {
  const t = await getTranslations("Friends");
  const friendIds = await getAcceptedFriendIds(userId);

  return (
    <Card className="group relative overflow-hidden rounded-[1.75rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.01] dark:bg-white/5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

      <CardContent className="relative z-10 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/5 sm:text-xs">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              {t("badge")}
            </div>
            <p className="text-lg font-bold text-foreground">{t("friendCount", { count: friendIds.length })}</p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/60 shadow-sm backdrop-blur-xl dark:bg-white/5">
            <Users className="h-5 w-5 text-emerald-500 dark:text-emerald-300" />
          </div>
        </div>

        <Link
          href="/friends"
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-opacity hover:opacity-90"
        >
          {t("viewFriends")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
