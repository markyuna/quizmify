import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";

const MAX_QUESTIONS = 10;

export const metadata = {
  title: "Practice Mistakes | Quizmify",
};

type PracticeQuestion = {
  id: string;
  question: string;
  answer: string;
  options: string[];
  questionType: string;
};

export default async function PracticeMistakesPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const failedAnswers = await prisma.attemptAnswer.findMany({
    where: {
      isCorrect: false,
      attempt: {
        userId,
      },
    },
    orderBy: {
      id: "desc",
    },
    select: {
      questionId: true,
    },
    take: 50,
  });

  const uniqueQuestionIds = Array.from(
    new Set(
      failedAnswers
        .map((item) => item.questionId)
        .filter((questionId): questionId is string => Boolean(questionId))
    )
  ).slice(0, MAX_QUESTIONS);

  if (uniqueQuestionIds.length === 0) {
    redirect("/quiz");
  }

  const questions = await prisma.question.findMany({
    where: {
      id: {
        in: uniqueQuestionIds,
      },
    },
    select: {
      id: true,
      question: true,
      answer: true,
      options: true,
      questionType: true,
    },
  });

  const questionsById = new Map<string, PracticeQuestion>(
    questions.map((question) => [
      question.id,
      {
        id: question.id,
        question: question.question,
        answer: question.answer,
        options: question.options,
        questionType: question.questionType ?? "mcq",
      },
    ])
  );

  const orderedQuestions = uniqueQuestionIds
    .map((id) => questionsById.get(id))
    .filter((question): question is PracticeQuestion => Boolean(question));

  if (orderedQuestions.length === 0) {
    redirect("/quiz");
  }

  const game = await prisma.game.create({
    data: {
      userId,
      topic: "Practice Mistakes",
      gameType: "mcq",
      timeStarted: new Date(),
      questions: {
        create: orderedQuestions.map((question) => ({
          question: question.question,
          answer: question.answer,
          options: question.options,
          questionType: question.questionType,
        })),
      },
    },
    select: {
      id: true,
    },
  });

  redirect(`/play/mcq/${game.id}`);
}