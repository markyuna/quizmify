import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Invalid email").max(255, "Email is too long"),
  subject: z.string().trim().min(1, "Subject is required").max(150, "Subject is too long"),
  message: z.string().trim().min(10, "Message is too short").max(2000, "Message is too long"),
  // Honeypot: real users never see or fill this field (hidden off-screen in
  // the form); a bot filling every input blindly will populate it, so a
  // non-empty value is treated as spam and silently dropped server-side.
  website: z.string().max(0, "Spam detected").optional().or(z.literal("")),
});

export type ContactFormData = z.infer<typeof contactSchema>;
