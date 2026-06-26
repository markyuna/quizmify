import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { endGameSchema } from "@/schemas/form/quiz";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { gameId } = endGameSchema.parse(body);

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { userId: true, timeEnded: true },
    });

    if (!game) {
      return NextResponse.json(
        { message: "Game not found" },
        { status: 404 }
      );
    }

    if (game.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (game.timeEnded !== null) {
      return NextResponse.json({ message: "Game already ended" }, { status: 200 });
    }

    await prisma.game.update({
      where: { id: gameId },
      data: { timeEnded: new Date() },
    });

    return NextResponse.json(
      { message: "Game ended" },
      { status: 200 }
    );
  } catch (error) {
    console.error("endGame error:", error);

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}