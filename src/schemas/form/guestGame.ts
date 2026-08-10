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
});

export const claimGuestAttemptsSchema = z.object({
  guestId: guestIdSchema,
});
