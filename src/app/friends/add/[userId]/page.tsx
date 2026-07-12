import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserPlus } from "lucide-react";

import { getAuthSession } from "@/lib/nextauth";
import { prisma } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AddFriendButton from "@/components/AddFriendButton";

export const metadata = {
  title: "Add Friend | Quizmify",
};

export default async function AddFriendPage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await getAuthSession();
  const t = await getTranslations("Friends");
  const { userId } = await params;

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/friends/add/${userId}`)}`);
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true },
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col items-center justify-center px-4 py-10 text-center">
      {!target ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("userNotFound")}</p>
      ) : (
        <>
          <Avatar className="h-16 w-16">
            {target.image && <AvatarImage src={target.image} alt={target.name ?? ""} />}
            <AvatarFallback>
              <UserPlus className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>

          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            {t("addFriendTitle", { name: target.name ?? "Anonymous" })}
          </h1>

          <AddFriendButton targetUserId={target.id} currentUserId={session.user.id} />
        </>
      )}
    </main>
  );
}
