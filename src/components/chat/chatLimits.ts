import type { CHAT_MESSAGE_MAX_LENGTH as SERVER_CHAT_MESSAGE_MAX_LENGTH } from "@/lib/chat";

/**
 * Client-safe copy of CHAT_MESSAGE_MAX_LENGTH: importing it from
 * src/lib/chat.ts would pull Prisma into the client bundle. The type-only
 * import is erased at build time, and since the server constant's type is
 * the literal 1000, tsc fails if the two values ever drift apart.
 */
export const CHAT_MESSAGE_MAX_LENGTH: typeof SERVER_CHAT_MESSAGE_MAX_LENGTH = 1000;

// The character counter only shows up near the limit.
export const CHAT_COUNTER_THRESHOLD = 800;
