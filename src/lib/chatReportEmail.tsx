import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import ChatReportEmail from "@/emails/ChatReportEmail";
import type { ChatReportDetails } from "@/lib/chat";

/**
 * Emails a new chat report to the moderation inbox. Called from after() in
 * the report route, so it never delays or fails the user's request: every
 * failure is logged and swallowed (the report row is already saved).
 * CHAT_REPORTS_EMAIL_TO falls back to CONTACT_EMAIL_TO, the owner's inbox.
 */
export async function sendChatReportEmail(report: ChatReportDetails): Promise<void> {
  const to = process.env.CHAT_REPORTS_EMAIL_TO ?? process.env.CONTACT_EMAIL_TO;
  if (!to) {
    console.error(`[chat] CHAT_REPORTS_EMAIL_TO / CONTACT_EMAIL_TO not set -- report ${report.reportId} saved without email.`);
    return;
  }

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: [report.reporterId, report.reportedUserId] } },
      select: { id: true, name: true },
    });
    const nameOf = (id: string) => users.find((user) => user.id === id)?.name ?? null;

    await sendEmail({
      to,
      subject: `[Chat report] ${report.reason}`,
      react: (
        <ChatReportEmail
          reportId={report.reportId}
          reason={report.reason}
          body={report.bodySnapshot}
          messageSentAt={report.messageCreatedAt}
          reporter={{ id: report.reporterId, name: nameOf(report.reporterId) }}
          reported={{ id: report.reportedUserId, name: nameOf(report.reportedUserId) }}
        />
      ),
    });
  } catch (error) {
    console.error(`[chat] failed to email report ${report.reportId}`, error);
  }
}
