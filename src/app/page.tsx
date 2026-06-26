import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Sparkles,
  BarChart3,
  RefreshCcw,
  CheckCircle2,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession } from "@/lib/nextauth";

export const metadata = {
  title: "Quizmify | AI Quiz Generator",
};

const ANSWER_OPTIONS = [
  { label: "JSON.parse()", correct: true },
  { label: "JSON.stringify()", correct: false },
  { label: "JSON.convert()", correct: false },
  { label: "JSON.decode()", correct: false },
];

export default async function HomePage() {
  const session = await getAuthSession();

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-400/20 blur-3xl animate-pulse dark:bg-violet-500/20" />
          <div className="absolute right-10 top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl animate-pulse dark:bg-cyan-500/20" />
          <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-fuchsia-400/15 blur-3xl animate-pulse dark:bg-fuchsia-500/15" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
          {/* Left — copy */}
          <div className="relative z-10">
            <div className="mb-6 flex items-center">
              <div className="origin-left scale-75 sm:scale-90 md:scale-100">
                <Logo />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Learn faster with AI-powered quizzes
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl dark:text-white">
              Create smarter quizzes and improve with every attempt.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Quizmify helps you generate quizzes in seconds, track your
              accuracy, review mistakes, and practice the concepts you actually
              need to improve.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href={session?.user ? "/quiz" : "/login"}>
                  {session?.user ? "Create a quiz" : "Get started"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="/history">View history</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                AI-generated quizzes
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Performance tracking
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Practice your mistakes
              </div>
            </div>
          </div>

          {/* Right — quiz preview mockup */}
          <div className="relative z-10">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-cyan-500/20 blur-2xl" />

            <div className="relative rounded-[2rem] border border-white/60 bg-white/70 p-1 shadow-2xl shadow-violet-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              {/* Titlebar */}
              <div className="flex items-center justify-between rounded-[1.6rem] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                    <BrainCircuit className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/70">Quiz in progress</p>
                    <p className="text-sm font-bold text-white">JavaScript Fundamentals</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1.5 backdrop-blur">
                  <Timer className="h-3.5 w-3.5 text-white" />
                  <span className="text-sm font-bold tabular-nums text-white">01:42</span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Progress */}
                <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>Question 3 / 10</span>
                  <span>30%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div className="h-full w-[30%] rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
                </div>

                {/* Question */}
                <div className="rounded-2xl border border-slate-200/60 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-300">Question 3</p>
                  <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                    Which method converts a JSON string into a JavaScript object?
                  </p>

                  <div className="mt-3 space-y-2">
                    {ANSWER_OPTIONS.map((opt) => (
                      <div
                        key={opt.label}
                        className={
                          opt.correct
                            ? "flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 dark:border-emerald-500/40 dark:bg-emerald-500/15"
                            : "rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-white/10 dark:bg-white/5"
                        }
                      >
                        <span className={`text-sm font-medium ${opt.correct ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400"}`}>
                          {opt.label}
                        </span>
                        {opt.correct && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center rounded-2xl border border-amber-200/60 bg-amber-50/80 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <p className="mt-1 text-base font-black text-slate-900 dark:text-white">2</p>
                    <p className="text-[10px] text-slate-400">Score</p>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl border border-violet-200/60 bg-violet-50/80 py-2.5 dark:border-violet-500/20 dark:bg-violet-500/10">
                    <Zap className="h-4 w-4 text-violet-500" />
                    <p className="mt-1 text-base font-black text-slate-900 dark:text-white">+20</p>
                    <p className="text-[10px] text-slate-400">XP</p>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl border border-cyan-200/60 bg-cyan-50/80 py-2.5 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-black text-white">3</div>
                    <p className="mt-1 text-base font-black text-slate-900 dark:text-white">Lvl</p>
                    <p className="text-[10px] text-slate-400">Level</p>
                  </div>
                </div>

                {/* Next button */}
                <button
                  disabled
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3 text-sm font-bold text-white opacity-90"
                >
                  Next Question →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-10 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <Card className="transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">AI quiz generation</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Generate relevant quiz questions instantly from any topic and start learning without wasting time preparing material.
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Track your progress</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Measure your accuracy, review your answers, and understand where your weak spots are with clear statistics after every quiz.
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                <RefreshCcw className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Practice your mistakes</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Turn previous wrong answers into new learning opportunities and reinforce the topics that matter most.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why Quizmify */}
      <section className="px-4 py-8 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none md:p-12">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                Why Quizmify
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl dark:text-white">
                Learn with feedback, not just repetition.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
                Most quiz tools stop after showing the score. Quizmify goes further by helping you understand your performance, revisit your mistakes, and train smarter over time.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-6 dark:bg-white/5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Faster setup</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Seconds</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-6 dark:bg-white/5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Question review</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Detailed</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-6 dark:bg-white/5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Mistake practice</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Smart</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-6 dark:bg-white/5">
                <p className="text-sm text-slate-500 dark:text-slate-400">Experience</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Premium</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 pt-8 md:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 p-8 text-center shadow-2xl shadow-violet-500/20 md:p-12">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to study smarter?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/85">
            Start generating quizzes, track your performance, and turn mistakes into progress with Quizmify.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="xl" variant="secondary" className="bg-white text-slate-900 hover:bg-white/90">
              <Link href={session?.user ? "/quiz" : "/login"}>
                {session?.user ? "Create your next quiz" : "Start now"}
              </Link>
            </Button>
            <Button asChild size="xl" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              <Link href="/history">See your progress</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
