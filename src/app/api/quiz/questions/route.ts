import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const topic = searchParams.get("topic");
    const difficulty = searchParams.get("difficulty");
    const limit = Math.min(Number(searchParams.get("limit") ?? 5), 20);

    let query = supabaseAdmin
      .from("mcq_questions")
      .select("*")
      .eq("is_active", true)
      .limit(limit);

    if (topic) {
      query = query.ilike("topic", `%${topic.trim()}%`);
    }

    if (
      difficulty === "easy" ||
      difficulty === "medium" ||
      difficulty === "hard"
    ) {
      query = query.eq("difficulty", difficulty);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/questions Supabase error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const shuffled = [...(data ?? [])].sort(() => Math.random() - 0.5);

    return NextResponse.json({
      success: true,
      questions: shuffled.slice(0, limit),
    });
  } catch (error) {
    console.error("GET /api/questions unexpected error:", error);

    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}