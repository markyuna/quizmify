import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { FREE_LEVEL_CAP } from "@/lib/stripe";

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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true, subscriptionStatus: true },
  });

  if (user && user.subscriptionStatus !== "pro" && user.level >= FREE_LEVEL_CAP) {
    redirect("/upgrade");
  }

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

  // Group by dedup key (same conceptual question across different games)
  const groups = new Map<string, Array<(typeof rawQuestions)[number]>>();
  for (const q of rawQuestions) {
    const key =
      q.sourceQuestionId?.trim() ||
      `${q.question.trim().toLowerCase()}::${q.answer.trim().toLowerCase()}`;
    const group = groups.get(key) ?? [];
    group.push(q);
    groups.set(key, group);
  }

  // Pick one representative per group (most recently updated = first due to orderBy)
  const questionsToPractice = Array.from(groups.values())
    .map((group) => group[0])
    .slice(0, MAX_QUESTIONS);

  if (questionsToPractice.length === 0) {
    redirect("/quiz");
  }

  // Collect all absorbed duplicate IDs — same conceptual question, but not chosen
  // for practice. Mark them resolved immediately so they don't resurface next session.
  const practiceIds = new Set(questionsToPractice.map((q) => q.id));
  const absorbedIds = rawQuestions
    .map((q) => q.id)
    .filter((id) => !practiceIds.has(id));

  const [game] = await Promise.all([
    prisma.game.create({
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
    }),

    absorbedIds.length > 0
      ? prisma.userQuestionProgress.updateMany({
          where: { userId, questionId: { in: absorbedIds } },
          data: { needsReview: false },
        })
      : Promise.resolve(),
  ]);

  redirect(`/play/mcq/${game.id}`);
}
