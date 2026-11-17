import * as React from "react";
import { Button, Heading, Text } from "@react-email/components";

import type { Locale } from "@/i18n/locales";
import { emailStrings } from "@/emails/i18n";
import EmailLayout, { BRAND_PURPLE } from "@/emails/components/EmailLayout";

type NeuronsReminderEmailProps = {
  locale: Locale;
  appUrl: string;
  balance: number;
  /** Cheapest Neuron game's per-play price. */
  cost: number;
  /** Correct medium/hard answers still missing for the next batch. */
  remainingForNext: number;
  /** Neurons credited per batch. */
  reward: number;
};

export default function NeuronsReminderEmail({
  locale,
  appUrl,
  balance,
  cost,
  remainingForNext,
  reward,
}: NeuronsReminderEmailProps) {
  const t = emailStrings[locale].neuronsReminder;

  return (
    <EmailLayout previewText={t.preview} locale={locale}>
      <Heading style={{ fontSize: 22, margin: "0 0 12px", color: "#0f172a" }}>{t.subject(balance)}</Heading>
      <Text style={{ fontSize: 15, lineHeight: "24px", color: "#334155" }}>{t.body(cost)}</Text>
      <Text
        style={{
          fontSize: 15,
          lineHeight: "24px",
          fontWeight: 700,
          color: BRAND_PURPLE,
          backgroundColor: "#f5f3ff",
          borderRadius: 12,
          padding: "10px 14px",
        }}
      >
        {t.progress(remainingForNext, reward)}
      </Text>
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
