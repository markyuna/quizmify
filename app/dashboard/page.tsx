import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authConfig } from "../auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authConfig);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Hola {session.user.name ?? "Usuario"}</p>
      <p>{session.user.email ?? ""}</p>
    </div>
  );
}