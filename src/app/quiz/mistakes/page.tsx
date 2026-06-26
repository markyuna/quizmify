import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

const MAX_QUESTIONS = 10;

export const metadata = {
  title: "Practice Mistakes | Quizmify",
};

export default async function PracticeMistakesPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const progressEntries = await prisma.userQuestionProgress.findMany({
    where: { userId, needsReview: true },
    orderBy: { updatedAt: "desc" },
    select: {
      question: {
        select: {
          id: true,
          question: true,
          answer: true,
          options: true,
          questionType: true,
          explanation: true,
          sourceQuestionId: true,
        },
      },
    },
    take: MAX_QUESTIONS * 3,
  });

  const rawQuestions = progressEntries
    .map((e) => e.question)
    .filter(
      (q) =>
        !!q &&
        q.question.trim() !== "" &&
        q.answer.trim() !== "" &&
        Array.isArray(q.options) &&
        q.options.length > 0
    );

  const seen = new Map<string, (typeof rawQuestions)[number]>();
  for (const q of rawQuestions) {
    const key =
      q.sourceQuestionId?.trim() ||
      `${q.question.trim().toLowerCase()}::${q.answer.trim().toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, q);
  }

  const questionsToPractice = Array.from(seen.values()).slice(0, MAX_QUESTIONS);

  if (questionsToPractice.length === 0) {
    redirect("/quiz");
  }

  const game = await prisma.game.create({
    data: {
      userId,
      topic: "Practice Mistakes",
      gameType: "mcq",
      timeStarted: new Date(),
      questions: {
        create: questionsToPractice.map((q) => ({
          question: q.question,
          answer: q.answer,
          options: q.options,
          questionType: q.questionType ?? "mcq",
          explanation: q.explanation,
          sourceQuestionId: q.sourceQuestionId ?? q.id,
        })),
      },
    },
    select: { id: true },
  });

  redirect(`/play/mcq/${game.id}`);
}
