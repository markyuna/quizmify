import LegalPage from "@/components/LegalPage";
import { cguCgvContent } from "@/content/legal/cgu-cgv";
import { getRequestLocale } from "@/i18n/get-locale";

export const metadata = {
  title: "CGU / CGV | Quizmify",
  description:
    "Conditions générales d'utilisation et de vente de Quizmify.",
  alternates: {
    canonical: "/cgu-cgv",
  },
};

export default async function CguCgvPage() {
  const locale = await getRequestLocale();

  return <LegalPage content={cguCgvContent[locale]} />;
}
