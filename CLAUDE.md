# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # run ESLint
```

There are no test scripts — the project has no test suite.

**Prisma workflows:**
```bash
npx prisma generate          # regenerate client after schema changes
npx prisma db push           # push schema changes to the database
npx prisma studio            # open DB GUI
```
Migrations/`db push` run against `DIRECT_URL` (see `prisma.config.ts`), while the app itself connects via `DATABASE_URL` through a `pg.Pool` + `PrismaPg` driver adapter (`src/lib/db.ts`) — Prisma 7 with `relationMode = "prisma"`, no native FKs.

## Architecture

Quizmify is a Next.js 16 app-router application. Users sign in with Google OAuth (or email/password), pick a topic and difficulty, and play MCQ quizzes. It has a full gamification layer (XP, levels, streaks, trophies, certificates), a Stripe-backed Pro tier, guest mini-games for unauthenticated visitors, and email notifications driven by Vercel Cron.

**This is not the Next.js you know.** Next.js 16 has breaking API/convention changes from training data — read `node_modules/next/dist/docs/` before writing framework code, and heed deprecation notices (see `AGENTS.md`).

### Data layer — two databases

- **PostgreSQL via Supabase + Prisma** (`src/lib/db.ts`): persists users, games, questions, attempts, XP/levels, streaks, trophies, certificates, friendships, referrals, guest attempts, and notification logs. Prisma client is generated into `src/generated/prisma/` (non-standard output path set in `prisma/schema.prisma`). Always import from `@/generated/prisma/client`, not from `@prisma/client`.

- **Supabase JS client** (`src/lib/supabase-admin.ts`): used as a question cache (`mcq_questions` table, mirrored by the `McqQuestion` model for reference — Prisma never queries it directly). The cache-then-generate pipeline lives in `src/lib/questionSourcing.ts`'s `sourceQuestions()`: fetch a pool of cached questions (`amount * 3`, deduped by question text), top it up with OpenAI generation when thin, save new questions back to the cache, then shuffle and slice. Both `/api/game` and the adaptive-difficulty next-batch route share this function so cache growth and randomization behave identically.

Many models carry inline schema comments explaining *why* a field exists (e.g. why `Certificate.topic` defaults to `""` instead of `null`, why `DailyChallenge.date` is a string, why XP is never clamped but level is capped for free users) — read `prisma/schema.prisma` directly rather than re-deriving that reasoning.

### Auth

NextAuth v4 with the Prisma adapter and both Google and Credentials (bcrypt) providers. Session strategy is **JWT**, not database — Credentials sign-in can't revalidate against a DB session on every request, so all providers use JWT once signed in; the adapter still creates/links `User`/`Account` rows for Google sign-ins. `getAuthSession()` (`src/lib/nextauth.ts`) is the server-side helper used in every route/page that needs the current user — it also enforces a 30-minute idle timeout server-side (`IDLE_TIMEOUT_MS`), bumped by the client's idle-timeout hook via `useSession().update()`.

### Paywall / Pro tier

`src/lib/paywall.ts` is the single source of truth for entitlement — every Pro gate should read through `isEffectivelyPro()`, `isUserPro()`, or `isUserAtFreeLimit()` rather than checking `subscriptionStatus` directly. Pro access comes from two independent sources that both need to be true-or-active: a real Stripe subscription (`subscriptionStatus === "pro"`) or a temporary grant (`premiumUntil` in the future, set by referrals or the free trial). Free-tier accounts are capped at `FREE_XP_CAP` (`src/lib/stripe.ts`, derived from `FREE_LEVEL_CAP = 2`) — `/api/quiz/submit` clamps stored XP just below that cap rather than ever letting it reach the ceiling.

Stripe env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.

### API routes

All routes live in `src/app/api/`. Key ones:

| Route | Purpose |
|---|---|
| `POST /api/game` | Create a game: source questions (cache+AI), optionally generate a Puzzle Mode image, write to Prisma |
| `POST /api/checkAnswer` | Validate one answer, write `userAnswer`/`isCorrect`, upsert `UserQuestionProgress` |
| `POST /api/endGame` | Stamp `timeEnded` on a game |
| `POST /api/quiz/questions` | Fetch questions for a game (used by quiz UI) |
| `GET  /api/game/mistakes` | Return questions the user got wrong (needs review) |
| `POST /api/daily-challenge/*` | The authenticated shared-per-day quiz (one per UTC day per language) |
| `GET/POST /api/guest/[gameKey]/*` | The 3 unauthenticated daily mini-games (word/photo/math) — see below |
| `POST /api/guest/claim` | Migrate a guest's attempts onto a real account after signup |
| `/api/stripe/*` | Checkout session creation + webhook handling for subscriptions |
| `/api/friends/*`, `/api/referrals/*`, `/api/leaderboard` | Social features |
| `/api/cron/daily-challenge`, `/api/cron/notifications` | Vercel Cron targets (see `vercel.json`) — generate the day's challenge and send reminder/summary emails |

Zod schemas for request/response shapes live in `src/schemas/form/quiz.ts`.

### AI question generation

`src/lib/questionGeneration.ts` builds prompts and calls OpenAI (`src/lib/openai.ts`, direct client with `response_format: { type: "json_object" }`) to generate/dedupe/shuffle MCQ batches. `src/lib/gpt.ts` exports `strict_output`, a separate lower-level wrapper that retries JSON parsing up to 3 times — not on the active `/api/game` path but available for other structured-output needs. Default model: `process.env.OPENAI_MODEL ?? "gpt-4o"`.

**Adaptive difficulty**: quizzes with `amount >= MIN_QUESTIONS_FOR_ADAPTIVE_DIFFICULTY` (`src/lib/adaptiveDifficulty.ts`) generate only the first half up front; the second half is generated by a `next-batch` route once the player reaches it, adjusted based on in-quiz performance.

**Puzzle Mode**: a Pro-only feature (`src/lib/puzzleImage.ts`) that generates a DALL-E image for the quiz topic and persists it to Supabase Storage (OpenAI's own image URLs expire after ~1 hour). A game's `puzzleImageUrl` being non-null is what drives the jigsaw-reveal UI in `MCQ.tsx` — there's no separate boolean flag.

### Guest games

Unauthenticated visitors get 3 daily mini-games (word-of-the-day, photo-of-the-day, math-target) under `/games`. Each registers a `GuestGameDefinition` (challenge generator + grader) in `src/lib/games/registerAll.ts`; shared plumbing in `src/lib/guestPlay.ts` handles daily rotation (`DailyGameChallenge`, one row per game/day/language), the one-attempt-per-guest-per-day guard, and claiming attempts onto a real account on signup (`GuestAttempt.claimedByUserId`). The guest identity is a non-PII opaque `guestId` minted client-side and stored in a cookie — it's a partition key, not a security boundary, mirroring the `quizmify_ref` referral cookie.

### Gamification

XP and levels are tracked on the `User` model (`xp`, `level`). XP math lives in `src/lib/xp.ts` (`calculateEarnedXpBreakdown`, `calculateLevel`); the dashboard reads progress via `getLevelProgress(totalXp)`. Streaks (`src/lib/streak.ts`, with monthly streak-protection tokens) and trophies (perfect score / streak) round out the loop. Certificates (`src/lib/certificates.ts`) are earned milestones (`quizzes_50`, `category_mastery`, `streak_7`) rendered to PDF via `pdfkit` (`src/lib/pdf/`) — `pdfkit` is excluded from Next's server bundling (`serverExternalPackages` in `next.config.ts`) because it reads font metrics relative to its own `__dirname`.

### Notifications

Transactional/reminder emails (streak reminders, daily challenge nudges, weekly summaries, premium-ending warnings) are sent via Resend using React Email templates (`src/emails/`). `src/lib/notifications.ts` + the `/api/cron/notifications` route drive sending; `NotificationLog`'s `[userId, type, dateKey]` unique constraint is the real anti-duplicate guard, not just an application-level check. Users opt in/out per-category via `NotificationPreference`. Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

### Internationalization

`next-intl` with **cookie-based** locale selection (`src/i18n/get-locale.ts`) — no `[locale]` URL routing or `middleware.ts`. Locale is read from a cookie, falling back to `Accept-Language`, falling back to `DEFAULT_LOCALE` (`src/i18n/locales.ts`). Message catalogs are `messages/{en,es,fr}.json`. Server code that needs the current locale outside of a React tree (e.g. `/api/game`) calls `getRequestLocale()` directly rather than a next-intl hook.

### Frontend patterns

- **UI components**: shadcn/ui primitives in `src/components/ui/`. Custom components in `src/components/` and `src/components/dashboard/`.
- **Styling**: Tailwind CSS v4 (PostCSS plugin, no `tailwind.config.js`).
- **Animations**: Framer Motion.
- **Forms**: react-hook-form + Zod via `@hookform/resolvers`.
- **Data fetching**: TanStack Query v5 for client-side fetching in quiz play components.
- **Theme**: next-themes via `ThemeProvider`, defaults to dark mode.

### Environment variables required

```
DATABASE_URL              # Supabase Postgres (pooler URL, used at runtime via PrismaPg adapter)
DIRECT_URL                # Direct Postgres URL (for migrations / prisma db push)
NEXT_PUBLIC_SUPABASE_URL  # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY # Supabase service role key (server-only)
AUTH_GOOGLE_ID            # Google OAuth client ID
AUTH_GOOGLE_SECRET        # Google OAuth client secret
NEXTAUTH_SECRET           # NextAuth secret
NEXTAUTH_URL              # App base URL
OPENAI_API_KEY            # OpenAI API key
OPENAI_MODEL              # (optional) defaults to gpt-4o
OPENAI_IMAGE_MODEL        # (optional) Puzzle Mode image model, defaults to gpt-image-1
STRIPE_SECRET_KEY         # Stripe API key
STRIPE_PRICE_ID           # Stripe Price ID for the Pro subscription
STRIPE_WEBHOOK_SECRET     # Stripe webhook signing secret
RESEND_API_KEY            # Resend API key (notification emails)
RESEND_FROM_EMAIL         # Verified sender address for Resend
```

`SUPABASE_SERVICE_ROLE_KEY` must be the **secret** key (`sb_secret_…`, or the
legacy `service_role` JWT). A publishable/anon key is subject to RLS and will
fail every Storage write — which is how Puzzle Mode's bucket setup breaks.
