import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getAuthSession } from "@/lib/nextauth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DeleteAccountButton from "@/components/DeleteAccountButton";

export const metadata = {
  title: "My Account | Quizmify",
  description: "Manage your Quizmify account and data.",
};

export default async function AccountPage() {
  const session = await getAuthSession();
  const t = await getTranslations("Account");

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {session.user.name}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {session.user.email}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              {t("deleteMyAccount")}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {t("deleteWarning")}{" "}
              <a href="/cgu-cgv" className="underline underline-offset-2">
                {t("refundPolicy")}
              </a>{" "}
              {t("beforeDeleting")}
            </p>
            <DeleteAccountButton />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
