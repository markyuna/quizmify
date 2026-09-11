import { redirect } from "next/navigation";

import PeintreCreation from "@/components/PeintreCreation";
import { getAuthSession } from "@/lib/nextauth";

export const metadata = { title: "Qui est le peintre ? | Quizmify" };

export default async function PeintrePage() {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <PeintreCreation />
    </div>
  );
}
