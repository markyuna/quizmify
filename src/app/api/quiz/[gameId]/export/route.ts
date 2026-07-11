import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { isUserPro } from "@/lib/paywall";
import { generateQuizPdf, type ExportVariant } from "@/lib/pdf/quiz-export";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ gameId: string }>;
};

function isValidVariant(value: string | null): value is ExportVariant {
  return value === "with-answers" || value === "without-answers";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "quiz";
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // PDF export is a Pro-only perk, independent of the free XP cap -- a
  // free user who hasn't hit the cap yet still can't export.
  if (!(await isUserPro(session.user.id))) {
    return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
  }

  const { gameId } = await params;
  const { searchParams } = new URL(req.url);
  const variantParam = searchParams.get("variant");
  const variant: ExportVariant = isValidVariant(variantParam)
    ? variantParam
    : "with-answers";

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      questions: {
        orderBy: { id: "asc" },
        select: {
          question: true,
          options: true,
          answer: true,
          userAnswer: true,
          isCorrect: true,
          explanation: true,
        },
      },
    },
  });

  if (!game || game.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!game.timeEnded) {
    return NextResponse.json({ error: "Quiz not completed yet" }, { status: 400 });
  }

  const pdfBuffer = await generateQuizPdf(
    {
      topic: game.topic,
      difficulty: game.difficulty,
      timeStarted: game.timeStarted,
      timeEnded: game.timeEnded,
      score: game.score,
      questions: game.questions,
    },
    variant
  );

  const filename = `quizmify-${slugify(game.topic)}-${variant}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
