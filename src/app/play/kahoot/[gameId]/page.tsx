import { redirect } from "next/navigation";

import QuizGame from "@/components/quiz-game/QuizGame";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

type KahootPageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export const metadata = {
  title: "Kahoot Mode | Quizmify",
};

export default async function KahootPage({ params }: KahootPageProps) {
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
          country: true,
          imageUrl: true,
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

  return <QuizGame game={game} />;
}
