import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LucideLayoutDashboard } from "lucide-react";
import { getTranslations } from "next-intl/server";

import NeuronHistoryList from "@/components/NeuronHistoryList";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Neurons History | Quizmify",
};

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function NeuronsHistoryPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const { page: pageParam } = await searchParams;
  const parsed = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  const t = await getTranslations("NeuronHistory");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { neuronsBalance: true },
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-start justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Link href="/categories" className={buttonVariants({ variant: "outline" })}>
                <Image
                  src="/icono-neurona/neurona-hex-48.png"
                  alt=""
                  width={16}
                  height={16}
                  className="mr-2"
                />
                {t("earnMore")}
              </Link>
              <Link href="/dashboard" className={buttonVariants()}>
                <LucideLayoutDashboard className="mr-2 h-4 w-4" />
                {t("backToDashboard")}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3">
            <Image src="/icono-neurona/neurona-hex-48.png" alt="" width={22} height={22} />
            <div>
              <p className="text-xs text-muted-foreground">{t("balanceLabel")}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {user?.neuronsBalance ?? 0}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{t("howItWorks")}</p>
        </CardHeader>

        <CardContent className="max-h-[60vh] overflow-y-auto">
          <NeuronHistoryList userId={userId} page={page} />
        </CardContent>
      </Card>
    </main>
  );
}
