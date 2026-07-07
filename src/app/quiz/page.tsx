import { redirect } from "next/navigation";

import QuizCreation from "@/components/QuizCreation";
import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { FREE_LEVEL_CAP } from "@/lib/stripe";

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

  if (!session?.user) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { level: true, subscriptionStatus: true },
  });

  if (user && user.subscriptionStatus !== "pro" && user.level >= FREE_LEVEL_CAP) {
    redirect("/upgrade");
  }

  const { topic } = await searchParams;

  const topicParam =
    typeof topic === "string" && topic !== "undefined" && topic !== "null"
      ? topic
      : "";

  return <QuizCreation topicParam={topicParam} />;
}
