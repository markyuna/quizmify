"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Check, Sparkles, Zap, BrainCircuit, RotateCcw, BarChart3, Infinity } from "lucide-react";

import { Button } from "@/components/ui/button";

const FREE_FEATURES = [
  "AI-generated quizzes on any topic",
  "Up to level 2 progression",
  "Performance stats & history",
  "Practice your mistakes",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited level progression",
  "Priority question generation",
  "Early access to new features",
];

function UpgradeContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[2rem] border border-emerald-200 bg-white p-10 text-center shadow-2xl shadow-emerald-500/10 dark:border-emerald-500/20 dark:bg-white/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-500/20">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
            Welcome to Pro!
          </h1>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            Your account has been upgraded. You now have unlimited level progression.
          </p>
          <Button asChild className="mt-8 w-full">
            <a href="/dashboard">Go to Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-16 md:px-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
          <Sparkles className="h-4 w-4" />
          Unlock your full potential
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
          Choose your plan
        </h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
          Start for free. Upgrade once to unlock unlimited progression.
        </p>
      </div>

      {canceled && (
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Payment canceled — no charge was made.
        </p>
      )}

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {/* Free */}
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-white/5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10">
            <BrainCircuit className="h-6 w-6 text-slate-600 dark:text-slate-300" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">Free</h2>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-black text-slate-900 dark:text-white">$0</span>
            <span className="text-slate-500">forever</span>
          </div>

          <ul className="mt-8 space-y-3">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                {f}
              </li>
            ))}
          </ul>

          <Button variant="outline" className="mt-8 w-full" asChild>
            <a href="/quiz">Start quizzing</a>
          </Button>
        </div>

        {/* Pro */}
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 p-px shadow-2xl shadow-violet-500/20">
          <div className="rounded-[1.7rem] bg-slate-900 p-8 dark:bg-slate-950">
            <div className="absolute right-6 top-6 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur">
              ONE-TIME
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/20">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-white">Pro</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-black text-white">$9.99</span>
              <span className="text-white/60">one-time</span>
            </div>

            <ul className="mt-8 space-y-3">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <Infinity className="h-5 w-5 shrink-0 text-violet-300" />
              <p className="text-sm text-white/70">
                Pay once, keep leveling forever. No subscriptions, no renewals.
              </p>
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="mt-6 w-full bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:opacity-90"
            >
              {loading ? "Redirecting to Stripe…" : "Upgrade to Pro →"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
        <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Secure payment via Stripe</div>
        <div className="flex items-center gap-2"><RotateCcw className="h-4 w-4" /> 7-day refund policy</div>
        <div className="flex items-center gap-2"><Check className="h-4 w-4" /> Instant activation</div>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  );
}
