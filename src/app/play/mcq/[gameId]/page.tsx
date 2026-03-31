import { redirect } from "next/navigation";

import MCQ from "@/components/MCQ";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

type MCQPageProps = {
  params: {
    gameId: string;
  };
};

export const metadata = {
  title: "MCQ Game | Quizmify",
};

export default async function MCQPage({ params: { gameId } }: MCQPageProps) {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/");
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
        },
      },
    },
  });

  if (!game) {
    redirect("/quiz");
  }

  return <MCQ game={game} />;
}