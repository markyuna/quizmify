import { Resend } from "resend";
import type { ReactElement } from "react";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "Quizmify <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/**
 * Sends a transactional email via Resend. No-ops (with a console warning)
 * when RESEND_API_KEY isn't set, so local dev and any environment that
 * hasn't configured it yet doesn't crash -- the same pattern this app
 * already uses for optional third-party keys.
 */
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getClient();

  if (!resend) {
    console.warn(`RESEND_API_KEY not set -- skipped email "${subject}" to ${to}`);
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    react,
  });

  if (error) {
    console.error(`Resend send error for "${subject}" to ${to}:`, error);
    return { sent: false, error: error.message };
  }

  return { sent: true };
}
