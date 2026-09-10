import { redirect } from "next/navigation";

import CrucigramaBoard from "@/components/CrucigramaBoard";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { toClientCrossword, type CrosswordLayout } from "@/lib/crucigrama/grid";

export const metadata = { title: "Crucigrama | Quizmify" };

export default async function CrucigramaGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  const { gameId } = await params;
  const game = await prisma.crucigramaGame.findUnique({ where: { id: gameId } });
  if (!game || game.userId !== session.user.id) redirect("/crucigrama");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <CrucigramaBoard
        gameId={game.id}
        topic={game.topic}
        difficulty={game.difficulty}
        initialStatus={
          game.status === "completed" || game.status === "revealed"
            ? game.status
            : "in_progress"
        }
        xpEarned={game.xpEarned}
        puzzle={toClientCrossword(JSON.parse(game.layout) as CrosswordLayout)}
      />
    </div>
  );
}
