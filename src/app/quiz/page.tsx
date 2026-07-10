import { redirect } from "next/navigation";

import QuizCreation from "@/components/QuizCreation";
import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { FREE_XP_CAP } from "@/lib/stripe";

export const metadata = {
  title: "Create Quiz | Quizmify",
};

type QuizPageProps = {
  searchParams: Promise<{
    topic?: string;
  }>;
};

export default async function QuizPage({ searchParams }: QuizPageProps) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { xp: true, subscriptionStatus: true },
  });

  const isPro = currentUser?.subscriptionStatus === "pro";

  if (!isPro && (currentUser?.xp ?? 0) >= FREE_XP_CAP) {
    redirect("/upgrade?limit=true");
  }

  const { topic } = await searchParams;

  const topicParam =
    typeof topic === "string" && topic !== "undefined" && topic !== "null"
      ? topic
      : "";

  return <QuizCreation topicParam={topicParam} />;
}