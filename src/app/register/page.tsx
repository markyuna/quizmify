import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BrainCircuit } from "lucide-react";

import RegisterForm from "@/components/RegisterForm";
import LoginButton from "@/components/LoginButton";
import { getAuthSession } from "@/lib/nextauth";

export const metadata = {
  title: "Create Account | Quizmify",
  alternates: {
    canonical: "/register",
  },
};

export default async function RegisterPage() {
  const session = await getAuthSession();
  const t = await getTranslations("Auth");

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/15" />
        <div className="absolute right-1/4 top-1/4 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/15" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-400/15 blur-3xl dark:bg-fuchsia-500/10" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 shadow-2xl shadow-violet-500/30">
            <BrainCircuit className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Quizmify
          </h1>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-8">
          <h2 className="text-center text-xl font-bold text-slate-900 dark:text-white">
            {t("createAccountTitle")}
          </h2>
          <p className="mt-1.5 text-center text-sm text-slate-500 dark:text-slate-400">
            {t("createAccountSubtitle")}
          </p>

          <div className="mt-6">
            <RegisterForm />
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="text-xs font-medium uppercase text-slate-400">{t("or")}</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <LoginButton />

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
              {t("signInLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
