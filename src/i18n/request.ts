import { getRequestConfig } from "next-intl/server";

import { getRequestLocale } from "./get-locale";

export default getRequestConfig(async () => {
  const locale = await getRequestLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
