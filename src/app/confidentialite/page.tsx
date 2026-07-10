import LegalPage from "@/components/LegalPage";
import { confidentialiteContent } from "@/content/legal/confidentialite";
import { getRequestLocale } from "@/i18n/get-locale";

export const metadata = {
  title: "Politique de confidentialité | Quizmify",
  description: "Comment Quizmify collecte, utilise et protège vos données personnelles.",
};

export default async function ConfidentialitePage() {
  const locale = await getRequestLocale();

  return <LegalPage content={confidentialiteContent[locale]} />;
}
