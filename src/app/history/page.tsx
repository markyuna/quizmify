import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";

import HistoryComponent from "@/components/HistoryComponent";
import { getAuthSession } from "@/lib/nextauth";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "History | Quizmify",
  description: "Review your quiz history.",
};

export default async function HistoryPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const attemptsCount = await prisma.attempt.count({
    where: { userId: session.user.id },
  });

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-4 py-8 sm:py-12">
      {/* Back link */}
      <Link
        href="/dashboard"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "mb-8 gap-2 text-muted-foreground hover:text-foreground"
        )}
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-xl">
          <History className="h-3.5 w-3.5 text-emerald-400" />
          History
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Quiz History
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {attemptsCount}{" "}
          {attemptsCount === 1 ? "attempt" : "attempts"} recorded
        </p>
      </div>

      {/* History list card */}
      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl sm:rounded-[1.75rem]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-violet-500/5" />

        <div className="relative px-4 py-2 sm:px-6">
          <HistoryComponent limit={100} userId={session.user.id} />
        </div>
      </div>
    </main>
  );
}
