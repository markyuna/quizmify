import QuizCreation from "@/components/QuizCreation";
import { getAuthSession } from "@/lib/nextauth";
import { isUserAtFreeLimit } from "@/lib/paywall";
import { getCategoryBySlug } from "@/lib/categories";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Quiz | Quizmify",
};

type QuizPageProps = {
  searchParams: Promise<{
    topic?: string;
    category?: string;
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

  const { topic, category } = await searchParams;

  const topicParam =
    typeof topic === "string" && topic !== "undefined" && topic !== "null"
      ? topic
      : "";

  // Only a real category slug is trusted through -- anything else (typo'd
  // or hand-edited URL) just falls back to "unknown topic" behavior in
  // QuizCreation, same as no category param at all.
  const categoryParam =
    typeof category === "string" && getCategoryBySlug(category) ? category : "";

  return (
    <QuizCreation
      topicParam={topicParam}
      categoryParam={categoryParam}
      isGuest={!session?.user?.id}
    />
  );
}