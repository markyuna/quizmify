import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import type { Locale } from "@/i18n/locales";
import { emailStrings } from "@/emails/i18n";
import { getSiteUrl } from "@/lib/site";

const BRAND_PURPLE = "#7c3aed";

type EmailLayoutProps = {
  previewText: string;
  locale: Locale;
  children: React.ReactNode;
};

/**
 * Shared chrome for all transactional emails: plain inline styles only
 * (email clients don't run Tailwind/CSS classes), a light brand header, and
 * an unsubscribe-adjacent footer pointing at /account where notification
 * preferences live.
 */
export default function EmailLayout({ previewText, locale, children }: EmailLayoutProps) {
  const appUrl = getSiteUrl();
  const t = emailStrings[locale];

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: "#f1f5f9", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 480, margin: "0 auto", padding: "32px 20px" }}>
          <Section style={{ textAlign: "center", marginBottom: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 700, color: BRAND_PURPLE, margin: 0 }}>
              Quizmify
            </Text>
          </Section>

          <Section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: "28px 24px",
              boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
            }}
          >
            {children}
          </Section>

          <Section style={{ textAlign: "center", marginTop: 24 }}>
            <Text style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
              <Link href={`${appUrl}/account`} style={{ color: "#94a3b8", textDecoration: "underline" }}>
                {t.footerLink}
              </Link>
            </Text>
          </Section>
          <Hr style={{ borderColor: "#e2e8f0", marginTop: 16 }} />
        </Container>
      </Body>
    </Html>
  );
}

export { BRAND_PURPLE };
