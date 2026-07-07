import { redirect } from "next/navigation";

import MCQ from "@/components/MCQ";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { FREE_LEVEL_CAP } from "@/lib/stripe";

type MCQPageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export const metadata = {
  title: "MCQ Game | Quizmify",
};

export default async function MCQPage({ params }: MCQPageProps) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  const { gameId } = await params;

  if (!gameId) {
    redirect("/quiz");
  }

  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      userId: session.user.id,
      gameType: "mcq",
    },
    include: {
      questions: {
        select: {
          id: true,
          question: true,
          answer: true,
          options: true,
          explanation: true,
        },
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!game) {
    redirect("/quiz");
  }

  if (game.timeEnded) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { level: true, subscriptionStatus: true },
    });

    if (user && user.subscriptionStatus !== "pro" && user.level >= FREE_LEVEL_CAP) {
      redirect("/upgrade");
    }
  }

  return <MCQ game={game} />;
}