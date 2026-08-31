import * as React from "react";
import { Hr, Text } from "@react-email/components";

import { DEFAULT_LOCALE } from "@/i18n/locales";
import EmailLayout from "@/emails/components/EmailLayout";

type ContactFormEmailProps = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

// Internal notification only (site owner's inbox, never seen by the
// visitor who submitted the form) -- unlike every other template in this
// directory, it's deliberately not localized to the visitor's language.
export default function ContactFormEmail({ name, email, subject, message }: ContactFormEmailProps) {
  return (
    <EmailLayout previewText={`New contact message from ${name}`} locale={DEFAULT_LOCALE}>
      <Text style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px", color: "#0f172a" }}>
        New contact form submission
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#334155", margin: "0 0 4px" }}>
        <strong>Name:</strong> {name}
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#334155", margin: "0 0 4px" }}>
        <strong>Email:</strong> {email}
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#334155", margin: "0 0 12px" }}>
        <strong>Subject:</strong> {subject}
      </Text>
      <Hr style={{ borderColor: "#e2e8f0", margin: "12px 0" }} />
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#334155", whiteSpace: "pre-wrap" }}>
        {message}
      </Text>
    </EmailLayout>
  );
}
