import Link from "next/link";
import { BrainCircuit } from "lucide-react";

import { getAuthSession } from "@/lib/nextauth";
import SignInButton from "./SignInButton";
import ThemeToggle from "./ThemeToggle";
import UserAccountNav from "./UserAccountNav";

export default async function Navbar() {
  const session = await getAuthSession();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 shadow-md shadow-violet-500/20">
            <BrainCircuit className="h-4 w-4 text-white" />
          </div>
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            Quizmify
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {session?.user ? (
            <UserAccountNav user={session.user} />
          ) : (
            <SignInButton text="Sign In" />
          )}
        </div>
      </div>
    </header>
  );
}