import { NextRequest, NextResponse } from "next/server";

import { getPopularTopics } from "@/lib/topics";
import { getRequestLocale } from "@/i18n/get-locale";
import { isLocale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const languageParam = request.nextUrl.searchParams.get("language");
  const language = isLocale(languageParam) ? languageParam : await getRequestLocale();

  try {
    const topics = await getPopularTopics(language);
    return NextResponse.json({ topics });
  } catch (error) {
    // A decorative "popular topics" carousel failing shouldn't break the
    // page it lives on -- log server-side and let the caller render nothing.
    console.error("Failed to fetch popular topics:", error);
    return NextResponse.json({ topics: [] });
  }
}
