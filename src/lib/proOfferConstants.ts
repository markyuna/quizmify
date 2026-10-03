// Pure module, deliberately with zero imports of its own: premium.ts's only
// import is `import type {...} from "@/generated/prisma/client"` (erased at
// compile time, no runtime cost), so re-exporting its REFERRAL_REWARD_DAYS
// here is safe for a client bundle. src/lib/proOffers.ts is NOT safe to
// import from a client component -- it imports `{ prisma } from "@/lib/db"`
// -- so NotificationBell.tsx/InviteToProCard.tsx must import the reward
// constant from here, never from proOffers.ts directly.
import { REFERRAL_REWARD_DAYS } from "@/lib/premium";

export const PRO_OFFER_REWARD_DAYS = REFERRAL_REWARD_DAYS;
export const PRO_OFFER_DAILY_LIMIT = 5;
