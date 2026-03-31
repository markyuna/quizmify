import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/nextauth";
import LoginButton from "@/components/LoginButton";

export const metadata = {
  title: "Login | Quizmify",
};

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <h1 className="mb-2 text-center text-3xl font-bold text-white">
          Bienvenido a Quizmify
        </h1>
        <p className="mb-6 text-center text-sm text-slate-300">
          Inicia sesión para guardar tu historial y ver tus estadísticas.
        </p>

        <LoginButton />
      </div>
    </div>
  );
}