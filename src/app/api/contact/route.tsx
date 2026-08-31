import { NextResponse } from "next/server";

import { contactSchema } from "@/schemas/form/contact";
import { sendEmail } from "@/lib/email";
import ContactFormEmail from "@/emails/ContactFormEmail";

const CONTACT_EMAIL_TO = process.env.CONTACT_EMAIL_TO;

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid form data" }, { status: 400 });
  }

  // Honeypot tripped -- pretend success so a bot doesn't learn to retry
  // without the hidden field.
  if (parsed.data.website) {
    return NextResponse.json({ success: true, message: "Message sent successfully" });
  }

  if (!CONTACT_EMAIL_TO) {
    console.error("CONTACT_EMAIL_TO is not configured -- contact form submission dropped.");
    return NextResponse.json({ success: false, message: "Configuration error" }, { status: 500 });
  }

  const { name, email, subject, message } = parsed.data;

  const result = await sendEmail({
    to: CONTACT_EMAIL_TO,
    subject: `[Contact] ${subject}`,
    react: <ContactFormEmail name={name} email={email} subject={subject} message={message} />,
  });

  if (!result.sent) {
    return NextResponse.json({ success: false, message: "Failed to send email" }, { status: 502 });
  }

  return NextResponse.json({ success: true, message: "Message sent successfully" });
}
