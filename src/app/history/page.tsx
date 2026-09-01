import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LucideLayoutDashboard } from "lucide-react";
import { getTranslations } from "next-intl/server";

import HistoryComponent from "@/components/HistoryComponent";
import NeuronHistoryList from "@/components/NeuronHistoryList";
import NeuronsShop from "@/components/shop/NeuronsShop";
import PurchaseToast from "@/components/history/PurchaseToast";
import TabBar from "@/components/TabBar";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "History | Quizmify",
  description: "Review your quiz history.",
};

type PageProps = {
  searchParams: Promise<{ tab?: string; page?: string }>;
};

export default async function HistoryPage({ searchParams }: PageProps) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const { tab: tabParam, page: pageParam } = await searchParams;
  const tab: "quizzes" | "neurons" = tabParam === "neurons" ? "neurons" : "quizzes";

  const t = await getTranslations("HistoryPage");
  const tNeurons = await getTranslations("NeuronHistory");

  // `page` only drives the Neurons tab's ledger pagination. The Quizzes
  // tab has no pagination of its own, so there's nothing to collide with.
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const neuronsBalance =
    tab === "neurons"
      ? (
          await prisma.user.findUnique({
            where: { id: userId },
            select: { neuronsBalance: true },
          })
        )?.neuronsBalance ?? 0
      : 0;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-start justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>

            <div className="flex flex-wrap gap-2">
              {tab === "neurons" && (
                <Link
                  href="/categories"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Image
                    src="/icono-neurona/neurona-hex-48.png"
                    alt=""
                    width={16}
                    height={16}
                    className="mr-2"
                  />
                  {tNeurons("earnMore")}
                </Link>
              )}
              <Link href="/dashboard" className={buttonVariants()}>
                <LucideLayoutDashboard className="mr-2 h-4 w-4" />
                {t("backToDashboard")}
              </Link>
            </div>
          </div>

          {/* Query-param tab navigation (no Tabs primitive in this
              project); each panel is its own server render with its own
              data fetch. Same TabBar the dashboard history card uses. */}
          <TabBar
            ariaLabel={t("title")}
            activeKey={tab}
            items={[
              { key: "quizzes", label: t("tabQuizzes"), href: "/history" },
              { key: "neurons", label: t("tabNeurons"), href: "/history?tab=neurons" },
            ]}
          />

          {tab === "neurons" && (
            <>
              <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3">
                <Image
                  src="/icono-neurona/neurona-hex-48.png"
                  alt=""
                  width={22}
                  height={22}
                />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {tNeurons("balanceLabel")}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {neuronsBalance}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{tNeurons("howItWorks")}</p>
            </>
          )}
        </CardHeader>

        <CardContent className="max-h-[60vh] overflow-y-auto">
          {tab === "neurons" ? (
            <div className="space-y-8">
              <Suspense fallback={null}>
                <PurchaseToast />
              </Suspense>
              <NeuronsShop />
              <NeuronHistoryList
                userId={userId}
                page={page}
                hrefForPage={(p) => `/history?tab=neurons&page=${p}`}
              />
            </div>
          ) : (
            <HistoryComponent limit={100} userId={userId} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
