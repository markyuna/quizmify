/**
 * Lives outside ThemeProvider.tsx ("use client") on purpose: layout.tsx is a
 * Server Component, and importing a plain value export from a client module
 * across that boundary resolves to undefined in this Next.js build, which
 * silently broke the blocking anti-flash script's localStorage key.
 */
export const THEME_STORAGE_KEY = "theme";
