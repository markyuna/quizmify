import { redirect } from "next/navigation";

import LoginButton from "@/components/LoginButton";
import { getAuthSession } from "@/lib/nextauth";

export const metadata = {
  title: "Login | Quizmify",
};

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-cyan-50 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-4 py-2 shadow-lg shadow-violet-500/20">
            <span className="text-lg font-bold tracking-tight text-white">
              Quizmify
            </span>
          </div>
        </div>

        <h1 className="mb-2 text-center text-3xl font-bold text-slate-900 dark:text-white">
          Bienvenido a Quizmify
        </h1>

        <p className="mb-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Inicia sesión para guardar tu historial y ver tus estadísticas.
        </p>

        <LoginButton />
      </div>
    </div>
  );
}