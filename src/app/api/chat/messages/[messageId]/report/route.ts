import { NextResponse, after } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/nextauth";
import { CHAT_REPORT_REASONS, reportChatMessage } from "@/lib/chat";
import { chatError, idParamSchema } from "@/lib/chatApi";
import { sendChatReportEmail } from "@/lib/chatReportEmail";

const bodySchema = z.object({ reason: z.enum(CHAT_REPORT_REASONS) });

export async function POST(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) return chatError("UNAUTHORIZED", 401);

  const messageId = idParamSchema.safeParse((await params).messageId);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!messageId.success || !parsed.success) return chatError("INVALID_INPUT", 400);

  const result = await reportChatMessage(session.user.id, messageId.data, parsed.data.reason);
  switch (result.outcome) {
    case "not_found":
      return chatError("MESSAGE_NOT_FOUND", 404);
    case "own_message":
      return chatError("CANNOT_REPORT_OWN_MESSAGE", 403);
    case "already_reported":
      return chatError("ALREADY_REPORTED", 409);
    case "created":
      // After the response: a Resend outage can't fail or slow the report.
      after(() => sendChatReportEmail(result.report));
      return NextResponse.json({ success: true }, { status: 201 });
  }
}
