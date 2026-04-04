import { redirect } from "next/navigation";

import QuizCreation from "@/components/QuizCreation";
import { getAuthSession } from "@/lib/nextauth";

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

  if (!session?.user) {
    redirect("/");
  }

  const { topic } = await searchParams;

  const topicParam =
    typeof topic === "string" && topic !== "undefined" && topic !== "null"
      ? topic
      : "";

  return <QuizCreation topicParam={topicParam} />;
}