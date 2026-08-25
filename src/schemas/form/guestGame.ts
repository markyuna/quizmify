import { z } from "zod";

// Kept as literals rather than importing GuestGameKey from the Prisma
// client -- this schema layer stays decoupled from the generated client,
// same as every other file in src/schemas/form.
export const GUEST_GAME_KEY_VALUES = ["word_of_day", "photo_of_day", "math_target"] as const;

export const guestGameKeySchema = z.enum(GUEST_GAME_KEY_VALUES);

// Not a security boundary (see isValidGuestId in guestPlay.ts) -- just a
// sanity bound on the client-minted id used to partition one attempt per
// guest per game per day.
export const guestIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/, "Invalid guest id");

export const submitGuestAttemptSchema = z.object({
  guestId: guestIdSchema,
  answer: z.unknown(),
  // The DailyGameChallenge id the client actually played against (from
  // useGuestChallenge's GET response) -- lets submitGuestAttempt() grade
  // against that exact challenge instead of re-resolving "today" by date,
  // which broke for any round that crossed the UTC day boundary between
  // its first guess and its final submit. Optional so an unrefreshed
  // client (or any other caller) still falls back to the by-date lookup.
  challengeId: z.string().min(1).optional(),
});

export const claimGuestAttemptsSchema = z.object({
  guestId: guestIdSchema,
});
