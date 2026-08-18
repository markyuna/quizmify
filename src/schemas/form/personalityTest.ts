import { z } from "zod";

// Kept as literals rather than importing PersonalityTestKey from the Prisma
// client -- same decoupling as guestGame.ts.
export const PERSONALITY_TEST_KEY_VALUES = ["quel_animal_es_tu"] as const;

export const personalityTestKeySchema = z.enum(PERSONALITY_TEST_KEY_VALUES);

// Not a security boundary -- same partition-key id as guestIdSchema in
// guestGame.ts, reused from the same quizmify_guest cookie.
export const guestIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/, "Invalid guest id");

const personalityTestAnswerSchema = z.object({
  questionId: z.string().min(1).max(50),
  optionId: z.string().min(1).max(50),
});

export const submitPersonalityTestSchema = z.object({
  guestId: guestIdSchema,
  answers: z.array(personalityTestAnswerSchema).min(1).max(50),
});

export const claimPersonalityTestAttemptsSchema = z.object({
  guestId: guestIdSchema,
});

const attemptIdSchema = z.string().min(1, "Attempt ID is required").max(50);

export const confirmPersonalityTestAttemptSchema = z.object({
  attemptId: attemptIdSchema,
});

// guestId is always sent (same "client always includes it, server only
// actually uses it when unauthenticated" contract as submitPersonalityTestSchema).
export const retryPersonalityTestAttemptSchema = z.object({
  attemptId: attemptIdSchema,
  guestId: guestIdSchema,
});
