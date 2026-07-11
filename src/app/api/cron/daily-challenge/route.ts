import { NextResponse } from "next/server";

import { getOrCreateTodaysChallenge } from "@/lib/dailyChallenge";
import { LOCALES } from "@/i18n/locales";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Pre-warms today's daily challenge in every supported locale so the first
 * visitor of the day in any language doesn't wait on an OpenAI call. Not
 * load-bearing -- /api/daily-challenge already lazily creates the challenge
 * (per locale) on first access, so this is purely an optimization. Wired up
 * via vercel.json's `crons` entry; Vercel signs its own cron requests with
 * `Authorization: Bearer $CRON_SECRET` when that env var is set, so this
 * checks it when present.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const challenges = await Promise.all(
    LOCALES.map((locale) => getOrCreateTodaysChallenge(locale))
  );

  return NextResponse.json({
    success: true,
    challenges: challenges.map((c) => ({ date: c.date, language: c.language, topic: c.topic })),
  });
}
