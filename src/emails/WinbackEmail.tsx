import * as React from "react";
import { Button, Column, Heading, Row, Text } from "@react-email/components";

import type { Locale } from "@/i18n/locales";
import { emailStrings } from "@/emails/i18n";
import EmailLayout, { BRAND_PURPLE } from "@/emails/components/EmailLayout";

type WinbackEmailProps = {
  locale: Locale;
  appUrl: string;
  daysInactive: number;
  level: number;
  neuronsBalance: number;
  longestStreak: number;
  /** Today's Daily Challenge topic -- this email replaces that day's challenge reminder. */
  challengeTopic: string | null;
};

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <Column style={{ textAlign: "center", padding: "0 6px", width: "33%" }}>
      <Text style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 2px" }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{label}</Text>
    </Column>
  );
}

export default function WinbackEmail({
  locale,
  appUrl,
  daysInactive,
  level,
  neuronsBalance,
  longestStreak,
  challengeTopic,
}: WinbackEmailProps) {
  const t = emailStrings[locale].winback;

  return (
    <EmailLayout previewText={t.preview} locale={locale}>
      <Heading style={{ fontSize: 22, margin: "0 0 12px", color: "#0f172a" }}>{t.heading(daysInactive)}</Heading>
      <Text style={{ fontSize: 15, lineHeight: "24px", color: "#334155", margin: "0 0 20px" }}>{t.body}</Text>

      <Row style={{ marginBottom: 20 }}>
        <StatBlock label={t.level} value={level} />
        <StatBlock label={t.neurons} value={neuronsBalance} />
        {longestStreak > 0 && <StatBlock label={t.bestStreak} value={t.days(longestStreak)} />}
      </Row>

      {challengeTopic && (
        <Text style={{ fontSize: 15, lineHeight: "24px", color: "#334155" }}>{t.challengeLine(challengeTopic)}</Text>
      )}

      <Button
        href={`${appUrl}/quiz`}
        style={{
          backgroundColor: BRAND_PURPLE,
          borderRadius: 12,
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 700,
          padding: "12px 24px",
          textDecoration: "none",
          marginTop: 8,
        }}
      >
        {t.cta}
      </Button>
    </EmailLayout>
  );
}
