import { redirect } from "next/navigation";

import PuzzleDuJourBoard from "@/components/PuzzleDuJourBoard";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

export const metadata = {
  title: "Puzzle du Jour | Quizmify",
};

export default async function PuzzleDuJourGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  const { gameId } = await params;
  const game = await prisma.puzzleDuJourGame.findUnique({ where: { id: gameId } });

  if (!game || game.userId !== session.user.id) {
    redirect("/puzzle-du-jour");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <PuzzleDuJourBoard
        gameId={game.id}
        topic={game.topic}
        difficulty={game.difficulty}
        gridCols={game.gridCols}
        gridRows={game.gridRows}
        imageUrl={game.imageUrl}
        initialStatus={game.status}
        xpEarned={game.xpEarned}
      />
    </div>
  );
}
