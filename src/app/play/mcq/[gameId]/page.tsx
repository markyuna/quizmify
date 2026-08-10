import { redirect } from "next/navigation";

import MCQ from "@/components/MCQ";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { getGuestIdFromCookie } from "@/lib/guestQuiz";

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
  const userId = session?.user?.id ?? null;
  const guestId = userId ? null : await getGuestIdFromCookie();

  if (!userId && !guestId) {
    redirect("/");
  }

  const { gameId } = await params;

  if (!gameId) {
    redirect("/quiz");
  }

  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      gameType: "mcq",
      // Owner-scoped either way: a real user's own games, or the specific
      // still-unclaimed guest game this browser's cookie created.
      ...(userId ? { userId } : { guestId, userId: null }),
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

  return <MCQ game={game} isGuest={!userId} />;
}