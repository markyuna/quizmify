import { redirect } from "next/navigation";

import PuzzleDuJourCreation from "@/components/PuzzleDuJourCreation";
import { getAuthSession } from "@/lib/nextauth";

export const metadata = {
  title: "Puzzle du Jour | Quizmify",
};

export default async function PuzzleDuJourPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <PuzzleDuJourCreation />
    </div>
  );
}
