import LegalPage from "@/components/LegalPage";
import { mentionsLegalesContent } from "@/content/legal/mentions-legales";
import { getRequestLocale } from "@/i18n/get-locale";

export const metadata = {
  title: "Mentions légales | Quizmify",
  description: "Mentions légales de Quizmify.",
};

export default async function MentionsLegalesPage() {
  const locale = await getRequestLocale();

  return <LegalPage content={mentionsLegalesContent[locale]} />;
}
