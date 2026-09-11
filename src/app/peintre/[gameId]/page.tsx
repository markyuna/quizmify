import { redirect } from "next/navigation";

import PeintreGameBoard from "@/components/PeintreGameBoard";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

export const metadata = { title: "Qui est le peintre ? | Quizmify" };

export default async function PeintreGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  const { gameId } = await params;
  const game = await prisma.peintreGame.findUnique({ where: { id: gameId } });
  if (!game || game.userId !== session.user.id) redirect("/peintre");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <PeintreGameBoard gameId={game.id} />
    </div>
  );
}
