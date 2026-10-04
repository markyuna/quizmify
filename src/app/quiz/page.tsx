import QuizCreation from "@/components/QuizCreation";
import { getAuthSession } from "@/lib/nextauth";
import { isUserAtFreeLimit } from "@/lib/paywall";
import { getCategoryBySlug } from "@/lib/categories";
import { quizCreationSchema } from "@/schemas/form/quiz";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Quiz | Quizmify",
};

type QuizPageProps = {
  searchParams: Promise<{
    topic?: string;
    category?: string;
    // Set by the result screen's "Rejouer" link (buildQuizReplayHref) so a
    // replay keeps the previous game's settings.
    difficulty?: string;
    amount?: string;
  }>;
};

export default async function QuizPage({ searchParams }: QuizPageProps) {
  const session = await getAuthSession();

  // Only real users are subject to the free-tier level cap -- a guest's
  // single quiz is bounded separately in POST /api/game (one quiz per
  // guestId, capped question count), not by this check.
  if (session?.user?.id && (await isUserAtFreeLimit(session.user.id))) {
    redirect("/upgrade?limit=true");
  }

  const { topic, category, difficulty, amount } = await searchParams;

  const topicParam =
    typeof topic === "string" && topic !== "undefined" && topic !== "null"
      ? topic
      : "";

  // Only a real category slug is trusted through -- anything else (typo'd
  // or hand-edited URL) just falls back to "unknown topic" behavior in
  // QuizCreation, same as no category param at all.
  const categoryParam =
    typeof category === "string" && getCategoryBySlug(category) ? category : "";

  // Same "only trust a valid value" stance as categoryParam: anything the
  // form schema wouldn't accept just falls back to QuizCreation's defaults.
  const parsedDifficulty = quizCreationSchema.shape.difficulty.safeParse(difficulty);
  const parsedAmount = quizCreationSchema.shape.amount.safeParse(Number(amount));

  return (
    <QuizCreation
      topicParam={topicParam}
      categoryParam={categoryParam}
      difficultyParam={parsedDifficulty.success ? parsedDifficulty.data : undefined}
      amountParam={parsedAmount.success ? parsedAmount.data : undefined}
      isGuest={!session?.user?.id}
    />
  );
}