import Image from "next/image";
import { redirect } from "next/navigation";
import { Sparkles, Trophy, BrainCircuit } from "lucide-react";
import Logo from "@/components/Logo";

import SignInButton from "@/components/SignInButton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { getAuthSession } from "./lib/nextauth";

export default async function Home() {
  const session = await getAuthSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <section className="relative flex min-h-[calc(100vh-6rem)] items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[10%] h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute right-[10%] top-[18%] h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[10%] left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-xl dark:bg-white/5">
            <Sparkles className="h-4 w-4 text-violet-400" />
            AI-powered quiz experience
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
              Learn faster with
              <span className="gradient-text"> AI-generated quizzes</span>
            </h1>

            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Create polished quizzes on any topic, test your knowledge in
              seconds, and track your progress with a premium learning
              experience built for focus and momentum.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="premium-panel surface-hover p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">Smart generation</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Instantly generate quizzes from any topic.
              </p>
            </div>

            <div className="premium-panel surface-hover p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">Premium UI</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                A modern interface designed to keep you engaged.
              </p>
            </div>

            <div className="premium-panel surface-hover p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-400">
                <Trophy className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">Track progress</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Measure results and improve over time.
              </p>
            </div>
          </div>
        </div>

        <Card className="glass-card relative overflow-hidden rounded-[2rem] border-white/10 p-2 shadow-2xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />

          <div className="relative">
            <CardHeader className="space-y-4 text-center">
              <div className="mb-6 flex justify-center">
                <Logo />
              </div>

              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold sm:text-3xl">
                  Start your next quiz
                </CardTitle>

                <CardDescription className="mx-auto max-w-sm text-sm leading-6 sm:text-base">
                  Sign in with Google to generate quizzes, review your results,
                  and build a smarter learning habit.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <SignInButton text="Sign in with Google" />

              <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/40 p-3 backdrop-blur-xl dark:bg-white/5">
                  <p className="text-lg font-bold">AI</p>
                  <p className="text-xs text-muted-foreground">Generated</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/40 p-3 backdrop-blur-xl dark:bg-white/5">
                  <p className="text-lg font-bold">MCQ</p>
                  <p className="text-xs text-muted-foreground">Interactive</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/40 p-3 backdrop-blur-xl dark:bg-white/5">
                  <p className="text-lg font-bold">Stats</p>
                  <p className="text-xs text-muted-foreground">Tracked</p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </section>
  );
}