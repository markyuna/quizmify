import * as React from "react";
import { Button, Heading, Hr, Row, Column, Text } from "@react-email/components";

import type { Locale } from "@/i18n/locales";
import { emailStrings } from "@/emails/i18n";
import EmailLayout, { BRAND_PURPLE } from "@/emails/components/EmailLayout";

export type WeeklySummaryTopicAccuracy = {
  topic: string;
  accuracyPercent: number;
  previousAccuracyPercent: number | null;
};

type WeeklySummaryEmailProps = {
  locale: Locale;
  appUrl: string;
  quizzesPlayed: number;
  currentStreak: number;
  longestStreakThisMonth: number;
  topicAccuracies: WeeklySummaryTopicAccuracy[];
};

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <Column style={{ textAlign: "center", padding: "0 6px" }}>
      <Text style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 2px" }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{label}</Text>
    </Column>
  );
}

export default function WeeklySummaryEmail({
  locale,
  appUrl,
  quizzesPlayed,
  currentStreak,
  longestStreakThisMonth,
  topicAccuracies,
}: WeeklySummaryEmailProps) {
  const t = emailStrings[locale].weeklySummary;

  return (
    <EmailLayout previewText={t.preview} locale={locale}>
      <Heading style={{ fontSize: 22, margin: "0 0 4px", color: "#0f172a" }}>{t.heading}</Heading>
      <Text style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px" }}>{t.intro}</Text>

      <Row>
        <StatBlock label={t.quizzesPlayed} value={quizzesPlayed} />
        <StatBlock label={t.currentStreak} value={currentStreak} />
        <StatBlock label={t.longestStreakThisMonth} value={longestStreakThisMonth} />
      </Row>

      <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />

      <Text style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>
        {t.accuracyByTopic}
      </Text>

      {topicAccuracies.length === 0 ? (
        <Text style={{ fontSize: 14, color: "#64748b" }}>{t.noTopicData}</Text>
      ) : (
        topicAccuracies.map(({ topic, accuracyPercent, previousAccuracyPercent }) => {
          const delta =
            previousAccuracyPercent === null ? null : accuracyPercent - previousAccuracyPercent;

          return (
            <Row key={topic} style={{ marginBottom: 8 }}>
              <Column>
                <Text style={{ fontSize: 14, color: "#334155", margin: 0 }}>{topic}</Text>
              </Column>
              <Column style={{ textAlign: "right" }}>
                <Text style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  {accuracyPercent}%{" "}
                  {delta !== null && delta !== 0 && (
                    <span style={{ fontSize: 12, color: delta > 0 ? "#16a34a" : "#dc2626" }}>
                      {delta > 0 ? t.improvedBy(delta) : t.droppedBy(Math.abs(delta))}
                    </span>
                  )}
                </Text>
              </Column>
            </Row>
          );
        })
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
          marginTop: 20,
        }}
      >
        {t.cta}
      </Button>
    </EmailLayout>
  );
}
