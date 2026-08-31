# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Working with this repo

- **Report before code**: for non-trivial changes, describe the investigation/plan and get a go-ahead before editing.
- **Shared database**: local `npm run dev` and one-off scripts hit the same production Supabase DB — there is no separate dev database. Treat local runs with the same care as production.
- **Restart after `prisma generate`**: `next dev` caches the old generated client; always restart the dev server after `npx prisma generate` or schema changes won't take effect.
- **Data-modification approval**: get explicit confirmation before any script-driven DB write or delete, even a single row.

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

Many models carry inline schema comments explaining *why* a field exists (e.g. why `Certificate.topic` defaults to `""` instead of `null`, why `DailyChallenge.date` is a string, why XP is never clamped but level is capped for free users, why `UserDailyAttempt` exists purely to dedupe XP, why `NeuronTransaction` is an append-only ledger rather than a running counter, why `CuratedQuizCompletion` and `CategoryRecommendationMascota` exist) — read `prisma/schema.prisma` directly rather than re-deriving that reasoning.

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
| `/api/puzzle-du-jour/*` | Pro-only daily jigsaw puzzle: eligibility check, create/fetch/complete a game, topic suggestions — see Puzzle du Jour below |
| `/api/personality-tests/[testKey]/*` | Submit/confirm/retry/status for a personality test attempt; `claim` migrates a guest attempt onto a real account, `mascot-nudge-dismiss` records dismissing the dashboard nudge |
| `/api/category-topics/*` | `lookup`/`search`/`suggest` — AI-assisted and cached topic suggestions scoped to a category, used by the quiz-creation search UI |
| `/api/stripe/*` | Checkout session creation + webhook handling for subscriptions |
| `/api/friends/*`, `/api/referrals/*`, `/api/leaderboard` | Social features |
| `/api/cron/daily-challenge`, `/api/cron/notifications` | Vercel Cron targets (see `vercel.json`) — generate the day's challenge and send reminder/summary emails |

Zod schemas for request/response shapes live in `src/schemas/form/quiz.ts`.

### AI question generation

`src/lib/questionGeneration.ts` builds prompts and calls OpenAI (`src/lib/openai.ts`, direct client with `response_format: { type: "json_object" }`) to generate/dedupe/shuffle MCQ batches. `src/lib/gpt.ts` exports `strict_output`, a separate lower-level wrapper that retries JSON parsing up to 3 times — not on the active `/api/game` path but available for other structured-output needs. Default model for MCQ generation: `process.env.OPENAI_MODEL ?? "gpt-4o"`. A handful of lighter-weight call sites (`strict_output`'s own default, `categoryTopics.ts`, `recommendations.ts`) hardcode `gpt-4.1-mini` instead — that's independent of `OPENAI_MODEL` and only applies to topic suggestions/recommendations, not the main quiz-generation path.

**AI prompt scoping**: every generation prompt gets a `CRITICAL SCOPE CONSTRAINT` block injected (`questionGeneration.ts`, built from `categoryName`/`countryScope`) so a topic stays pinned to its category — e.g. "Les fleuves" under "La France" can't drift into rivers worldwide. `categorySlug` is persisted on `Game` at creation time; the `next-batch` route re-derives `categoryName`/`countryScope` from that stored value rather than doing a fresh lookup, so the second half of an adaptive-difficulty quiz gets the exact same scope constraint as the first half.

**Adaptive difficulty**: quizzes with `amount >= MIN_QUESTIONS_FOR_ADAPTIVE_DIFFICULTY` (`src/lib/adaptiveDifficulty.ts`) generate only the first half up front; the second half is generated by a `next-batch` route once the player reaches it, adjusted based on in-quiz performance.

**Puzzle Mode**: a Pro-only feature (`src/lib/puzzleImage.ts`) that generates a DALL-E image for the quiz topic and persists it to Supabase Storage (OpenAI's own image URLs expire after ~1 hour). A game's `puzzleImageUrl` being non-null is what drives the jigsaw-reveal UI in `MCQ.tsx` — there's no separate boolean flag. Distinct from **Puzzle du Jour** below, which is a separate daily jigsaw game, not tied to a quiz's `puzzleImageUrl`.

### Guest games

Unauthenticated visitors get 3 daily mini-games (word-of-the-day, photo-of-the-day, math-target) under `/games`. Each registers a `GuestGameDefinition` (challenge generator + grader) in `src/lib/games/registerAll.ts`; shared plumbing in `src/lib/guestPlay.ts` handles daily rotation (`DailyGameChallenge`, one row per game/day/language), the one-attempt-per-guest-per-day guard, and claiming attempts onto a real account on signup (`GuestAttempt.claimedByUserId`). The guest identity is a non-PII opaque `guestId` minted client-side and stored in a cookie — it's a partition key, not a security boundary, mirroring the `quizmify_ref` referral cookie.

### Gamification

XP and levels are tracked on the `User` model (`xp`, `level`). XP math lives in `src/lib/xp.ts` (`calculateEarnedXpBreakdown`, `calculateLevel`); the dashboard reads progress via `getLevelProgress(totalXp)`. Streaks (`src/lib/streak.ts`, with monthly streak-protection tokens) and trophies (perfect score / streak) round out the loop. Certificates (`src/lib/certificates.ts`) are earned milestones (`quizzes_50`, `category_mastery`, `streak_7`) rendered to PDF via `pdfkit` (`src/lib/pdf/`) — `pdfkit` is excluded from Next's server bundling (`serverExternalPackages` in `next.config.ts`) because it reads font metrics relative to its own `__dirname`. XP and Neuronas (below) are two independent currencies — don't assume XP logic applies to Neurons or vice versa.

### Neuronas (virtual currency)

Neurons (`User.neuronsBalance`) are a second, independent currency — deliberately never sharing calculation logic with `src/lib/xp.ts` (a past bug leaked `completionXp` across systems when they shared a computation, so `src/lib/neurons.ts` stays its own module by design).

- **Earning**: `creditNeuronsForQuiz()` awards 50 Neurons per 10 accumulated correct answers, counted only across medium/hard-difficulty games (`ELIGIBLE_DIFFICULTIES`) — easy games earn nothing. The total is derived fresh on every call from `Attempt` history plus the `NeuronTransaction` ledger (never a separate running counter), so nothing can drift out of sync. Must run inside the same `$transaction` as the rest of `/api/quiz/submit`. `getNeuronsProgress()` exposes the same "how close to the next batch" math for dashboard reads outside a transaction.
- **Personality-test bonus**: `withPersonalityBonus()` merges a one-time +50 Neuron bonus into the same `tx.user.update()` call that first sets `personalityAnimal` (i.e. only on transition from `null` to a value), via Prisma's nested `neuronTransactions` write — ledger row, balance increment, and animal assignment happen as one write.
- **Spending**: `src/lib/neurons/costs.ts` holds `NEURON_UNLOCK_COSTS`, currently one entry — unlocking Puzzle du Jour costs 100 Neurons. Kept separate from `ALL_GAMES` (`src/lib/games/allGames.ts`), which is presentation-layer config for listing games; the Neuron price a `pro-neuron` entry displays is imported from here. Expect more `gameKey` entries here as more Neuron-unlockable games ship.
- **Ledger**: `NeuronTransaction` (append-only, types include `earn_quiz` and `bonus_personality`) is the source of truth `creditNeuronsForQuiz` reconciles against — it never re-credits a batch already reflected in the ledger.

### Puzzle du Jour

A Pro-only daily jigsaw puzzle, separate from "Puzzle Mode" (see AI question generation above) — don't conflate the two. Routes under `/api/puzzle-du-jour/*`; core config in `src/lib/puzzleDuJour.ts` and image generation in `puzzleDuJourImage.ts`.

- Gated by `isEffectivelyPro()` (same paywall helper as everywhere else) in both `route.ts` and `eligibility/route.ts`.
- `PUZZLE_DU_JOUR_DAILY_LIMIT = 2` puzzle rows per user per UTC day; a topic rejected by moderation never creates a row, so it doesn't count against the limit.
- Fixed grid per difficulty — easy 4×4, medium 7×7, hard 10×10 (`PUZZLE_DU_JOUR_GRID`) — picked from the product spec's ranges, not randomized within them.
- Flat XP per difficulty (20/35/50, `PUZZLE_DU_JOUR_XP`) — deliberately not derived from `calculateEarnedXpBreakdown`, since there's no "correct answers" concept here.
- Deliberately isolated from `guestPlay.ts` — it shares nothing with the guest daily-games system.
- Can also be unlocked with Neurons (100, see above) rather than only via Pro status — check `neurons/costs.ts` and the eligibility route together when working on access logic.

### Personality test — "Quel animal es-tu ?"

Config in `src/lib/personalityTests/quelAnimalEsTu.config.ts`; routes under `/api/personality-tests/[testKey]/*` (`submit`, `confirm`, `retry`, `status`) plus `claim` (migrate a guest attempt onto a real account, mirroring `GuestAttempt.claimedByUserId`) and `mascot-nudge-dismiss`.

- Scores land on one of 6 animals (`ANIMAL_KEYS`: lion, dauphin, hibou, renard, loup, ours) via per-question `weights`.
- A second, independent axis (`categoryWeights`, present only on later questions) scores interest across the 17 real category slugs (`CATEGORY_SLUGS` — a hand-maintained literal list mirroring `src/lib/categories.ts`; must be kept in sync by hand) and feeds cold-start topic recommendations via `src/lib/categoryRecommendations.ts`. This axis never affects the animal result.
- First-time completion also grants the +50 Neuron bonus (`withPersonalityBonus`, see Neuronas above).
- UI touchpoints: `MascotDiscoveryNudge.tsx` (dashboard nudge), `PersonalityMascotCard.tsx`, `HeroMascot.tsx`.

### Curated quizzes

Hand-curated, image-based question sets that bypass AI generation entirely. Registry in `src/lib/curatedQuizzes/registry.ts` (`CURATED_QUIZZES`), e.g. "Qui est le peintre?" (`quiEstLePeintre.ts`).

- `findCuratedQuiz(categorySlug, topicNormalized)` is the only lookup path, called from `/api/game/route.ts` and `QuizCreation.tsx`.
- Lookup is keyed on the topic's canonical `topicNormalized` text, **never** the visitor's active UI locale — curated content exists in only one language, but a visitor in a different locale must still land on the same curated quiz rather than falling through to AI generation.
- Curated quizzes launch through the normal `/quiz` creation flow with topic+category prefilled (see `QUI_EST_LE_PEINTRE_HREF` in `PrimaryNav.tsx`), not a dedicated route.
- `CuratedQuizCompletion` tracks completions in Prisma.

### Notifications

Transactional/reminder emails (streak reminders, daily challenge nudges, weekly summaries, premium-ending warnings) are sent via Resend using React Email templates (`src/emails/`). `src/lib/notifications.ts` + the `/api/cron/notifications` route drive sending; `NotificationLog`'s `[userId, type, dateKey]` unique constraint is the real anti-duplicate guard, not just an application-level check. Users opt in/out per-category via `NotificationPreference`. Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

### Internationalization

`next-intl` with **cookie-based** locale selection (`src/i18n/get-locale.ts`) — no `[locale]` URL routing or `middleware.ts`. Locale is read from a cookie, falling back to `Accept-Language`, falling back to `DEFAULT_LOCALE` (`src/i18n/locales.ts`). Message catalogs are `messages/{en,es,fr}.json`. Server code that needs the current locale outside of a React tree (e.g. `/api/game`) calls `getRequestLocale()` directly rather than a next-intl hook.

**Policy**: all new UI text ships in all three locales (fr/es/en) from day one — never add a key to one catalog and backfill the others later.

### Frontend patterns

- **UI components**: shadcn/ui primitives in `src/components/ui/`. Custom components in `src/components/` and `src/components/dashboard/`.
- **Styling**: Tailwind CSS v4 (PostCSS plugin, no `tailwind.config.js`).
- **Animations**: Framer Motion.
- **Forms**: react-hook-form + Zod via `@hookform/resolvers`.
- **Data fetching**: TanStack Query v5 for client-side fetching in quiz play components.
- **Theme**: custom `ThemeProvider.tsx` (`src/components/ThemeProvider.tsx`) — no `next-themes` dependency. `defaultTheme = "dark"`. Toggles the `dark` class + `colorScheme` on `document.documentElement`, persists to `localStorage`, and syncs across tabs via the `storage` event; a blocking inline script in `layout.tsx` applies the class before hydration to avoid a flash of the wrong theme.

### Navigation

`PrimaryNav.tsx` (`src/components/nav/`) is the site header nav.

- **Desktop**: Radix-based `DropdownMenu` for both Categories and Games. The Categories dropdown links straight to each `/quiz/categoria/{slug}` page, not to `/categories` — `/categories` (`src/app/categories/page.tsx`) is a fully built grouped-category index page, but nothing currently links to it from navigation.
- **Mobile**: a custom accordion (`MobileDisclosure`, plain `useState` + rotating `ChevronDown`) — same idiom as `CategorySidebar.tsx`'s `CategoryGroupDisclosure`. There is no Radix Accordion in the project; don't reach for one.

### Games catalog

`ALL_GAMES` (`src/lib/games/allGames.ts`) is the single source of truth for **every** game the app lists in a "games" surface — the 3 free guest mini-games plus Puzzle du Jour, Morpion, and "Qui est le peintre?". Each entry carries `kind` (`guest` | `pro-neuron` | `curated`), `href`, an `(i18nNamespace, i18nKey)` title pair, image, and presentational hints (`neuronCost`, `showProBadge`). `QUI_EST_LE_PEINTRE_HREF` lives here too. Add a game here once and it shows up in all four surfaces.

The four surfaces all iterate `ALL_GAMES` and render `<GameCard>` (`src/components/games/GameCard.tsx`, a presentational, no-`"use client"`, no-fetch component with `grid`/`list`/`dropdown` variants): `GamesSidebarSection.tsx` (`/categories`), `CategorySidebar.tsx` (`/quiz/categoria/[slug]`), `GameCarousel.tsx` (homepage), and `PrimaryNav.tsx` (header, desktop + mobile). Puzzle du Jour's card in the three grid surfaces is `<PuzzleDuJourGameCard>` instead — a client island that owns the eligibility fetch + unlock-modal flow; the nav keeps a plain `<GameCard>`.

`GAMES_CATALOG` (`src/lib/games/catalog.ts`) still exists but is now **derived** — `ALL_GAMES.filter(kind === "guest")` remapped to the flatter `{ key, titleKey, teaserKey, image, icon }` shape — for the callers that only deal with guest games (`/games/page.tsx`, the guest-play plumbing). The Neuron price of a `pro-neuron` game lives in `neurons/costs.ts` (`NEURON_UNLOCK_COSTS`, `MORPION_COST_PER_GAME`) and is referenced from `ALL_GAMES` — see Neuronas above.

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
CONTACT_EMAIL_TO          # Destination inbox for /contact form submissions (distinct from RESEND_FROM_EMAIL)
```

`SUPABASE_SERVICE_ROLE_KEY` must be the **secret** key (`sb_secret_…`, or the
legacy `service_role` JWT). A publishable/anon key is subject to RLS and will
fail every Storage write — which is how Puzzle Mode's bucket setup breaks.
