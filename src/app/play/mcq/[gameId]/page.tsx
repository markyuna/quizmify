import { redirect } from "next/navigation";

import MCQ from "@/components/MCQ";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { getGuestIdFromCookie } from "@/lib/guestQuiz";
import { getNeuronsProgress, isNeuronsEligibleDifficulty } from "@/lib/neurons";

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

  // How far the user already was toward their next 50-Neuron batch *before*
  // this quiz -- the starting point for MCQ's live in-quiz Neurons badge.
  // Only meaningful for a signed-in user on a medium/hard game (easy games
  // earn no Neurons); null otherwise, and MCQ then hides the badge entirely.
  const initialNeuronsCorrectTowardNext =
    userId && isNeuronsEligibleDifficulty(game.difficulty)
      ? (await getNeuronsProgress(prisma, userId)).correctTowardNext
      : null;

  return (
    <MCQ
      game={game}
      isGuest={!userId}
      initialNeuronsCorrectTowardNext={initialNeuronsCorrectTowardNext}
    />
  );
}