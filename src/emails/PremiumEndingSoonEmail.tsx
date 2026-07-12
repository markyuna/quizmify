import * as React from "react";
import { Button, Heading, Text } from "@react-email/components";

import type { Locale } from "@/i18n/locales";
import { emailStrings } from "@/emails/i18n";
import EmailLayout, { BRAND_PURPLE } from "@/emails/components/EmailLayout";

type PremiumEndingSoonEmailProps = {
  locale: Locale;
  appUrl: string;
};

export default function PremiumEndingSoonEmail({ locale, appUrl }: PremiumEndingSoonEmailProps) {
  const t = emailStrings[locale].premiumEndingSoon;

  return (
    <EmailLayout previewText={t.preview} locale={locale}>
      <Heading style={{ fontSize: 22, margin: "0 0 12px", color: "#0f172a" }}>{t.heading}</Heading>
      <Text style={{ fontSize: 15, lineHeight: "24px", color: "#334155" }}>{t.body}</Text>
      <Button
        href={`${appUrl}/upgrade`}
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
