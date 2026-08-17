import { getRequestConfig } from "next-intl/server";

import { getRequestLocale } from "./get-locale";

// `locale` here is next-intl's own override channel: a caller that awaits
// getTranslations({ locale: X }) has that X passed back in on this param,
// distinct from the request's ambient cookie locale (see GetRequestConfigParams
// in next-intl/server). Ignoring it (as this used to) makes any such
// explicit-locale call silently resolve to the cookie's locale instead of
// the one actually requested -- e.g. /play/mcq/[gameId]/page.tsx resolving a
// curated quiz's title in game.language (the locale its Question rows were
// actually translated into at creation, per /api/game/route.ts) rather than
// whatever the viewer's site-wide locale currently is.
export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const locale = explicitLocale ?? (await getRequestLocale());

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
