import { redirect } from "next/navigation";

import CrucigramaCreation from "@/components/CrucigramaCreation";
import { getAuthSession } from "@/lib/nextauth";

export const metadata = { title: "Crucigrama | Quizmify" };

export default async function CrucigramaPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <CrucigramaCreation />
    </div>
  );
}
