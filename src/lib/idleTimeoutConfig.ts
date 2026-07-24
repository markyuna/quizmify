// Shared between the client hook and the NextAuth server callbacks, so the
// timeout can't drift between what the UI counts down and what invalidates
// the session. NEXT_PUBLIC_ prefix is required for the client bundle to see it.
export const IDLE_TIMEOUT_MINUTES = Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES) || 30;
export const IDLE_WARNING_MINUTES = 1;

export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60_000;
export const IDLE_WARNING_MS = IDLE_WARNING_MINUTES * 60_000;
