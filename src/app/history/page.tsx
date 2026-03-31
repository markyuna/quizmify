import Link from "next/link";
import { redirect } from "next/navigation";
import { LucideLayoutDashboard } from "lucide-react";

import HistoryComponent from "@/components/HistoryComponent";
import { getAuthSession } from "@/lib/nextauth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "History | Quizmify",
  description: "Review your quiz history.",
};

export default async function HistoryPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-2xl font-bold">History</CardTitle>

            <Link href="/dashboard" className={buttonVariants()}>
              <LucideLayoutDashboard className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </CardHeader>

        <CardContent className="max-h-[60vh] overflow-y-auto">
          <HistoryComponent limit={100} userId={session.user.id} />
        </CardContent>
      </Card>
    </main>
  );
}