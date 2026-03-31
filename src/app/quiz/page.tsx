import { redirect } from "next/navigation";
import QuizCreation from "@/components/QuizCreation";
import { getAuthSession } from "@/lib/nextauth";

export const metadata = {
  title: "Create Quiz | Quizmify",
};

interface QuizPageProps {
  searchParams: Promise<{
    topic?: string;
  }>;
}

export default async function QuizPage({ searchParams }: QuizPageProps) {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/");
  }

  const { topic } = await searchParams;

  const topicParam =
    topic && topic !== "undefined" && topic !== "null" ? topic : "";

  return <QuizCreation topicParam={topicParam} />;
}