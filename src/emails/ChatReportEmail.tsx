import * as React from "react";
import { Hr, Text } from "@react-email/components";

import { DEFAULT_LOCALE } from "@/i18n/locales";
import EmailLayout from "@/emails/components/EmailLayout";

type ChatReportEmailProps = {
  reportId: string;
  reason: string;
  body: string;
  messageSentAt: string;
  reporter: { id: string; name: string | null };
  reported: { id: string; name: string | null };
};

const lineStyle = { fontSize: 14, lineHeight: "22px", color: "#334155", margin: "0 0 4px" };

// Internal moderation notice (owner's inbox, never seen by users) -- the
// same deliberate exception to localization as ContactFormEmail.
export default function ChatReportEmail({ reportId, reason, body, messageSentAt, reporter, reported }: ChatReportEmailProps) {
  return (
    <EmailLayout previewText={`Chat message reported (${reason})`} locale={DEFAULT_LOCALE}>
      <Text style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px", color: "#0f172a" }}>
        Chat message reported
      </Text>
      <Text style={lineStyle}>
        <strong>Reason:</strong> {reason}
      </Text>
      <Text style={lineStyle}>
        <strong>Reported user:</strong> {reported.name ?? "(no name)"} ({reported.id})
      </Text>
      <Text style={lineStyle}>
        <strong>Reported by:</strong> {reporter.name ?? "(no name)"} ({reporter.id})
      </Text>
      <Text style={lineStyle}>
        <strong>Sent at:</strong> {messageSentAt}
      </Text>
      <Text style={{ ...lineStyle, margin: "0 0 12px" }}>
        <strong>Report id:</strong> {reportId}
      </Text>
      <Hr style={{ borderColor: "#e2e8f0", margin: "12px 0" }} />
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#334155", whiteSpace: "pre-wrap" }}>{body}</Text>
    </EmailLayout>
  );
}
