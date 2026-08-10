import QuizCreation from "@/components/QuizCreation";
import { getAuthSession } from "@/lib/nextauth";
import { isUserAtFreeLimit } from "@/lib/paywall";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Quiz | Quizmify",
};

type QuizPageProps = {
  searchParams: Promise<{
    topic?: string;
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

  const { topic } = await searchParams;

  const topicParam =
    typeof topic === "string" && topic !== "undefined" && topic !== "null"
      ? topic
      : "";

  return <QuizCreation topicParam={topicParam} isGuest={!session?.user?.id} />;
}