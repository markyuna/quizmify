import { redirect } from "next/navigation";

import OpenEnded from "@/components/OpenEnded";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

type OpenEndedPageProps = {
  params: {
    gameId: string;
  };
};

export const metadata = {
  title: "Open-Ended Game | Quizmify",
};

export default async function OpenEndedPage({
  params: { gameId },
}: OpenEndedPageProps) {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/");
  }

  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      userId: session.user.id,
      gameType: "open_ended",
    },
    include: {
      questions: {
        select: {
          id: true,
          question: true,
          answer: true,
        },
      },
    },
  });

  if (!game) {
    redirect("/quiz");
  }

  return <OpenEnded game={game} />;
}