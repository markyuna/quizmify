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

## Architecture

Quizmify is a Next.js 16 app-router application. Users sign in with Google OAuth, pick a topic and difficulty, and play MCQ quizzes. It has a gamification layer (XP, levels) and a mistake-review flow.

### Data layer — two databases

- **PostgreSQL via Supabase + Prisma** (`src/lib/db.ts`): persists users, games, questions, attempts, XP/levels, and per-question progress. Prisma client is generated into `src/generated/prisma/` (non-standard output path set in `prisma/schema.prisma`). Always import from `@/generated/prisma/client`, not from `@prisma/client`.

- **Supabase JS client** (`src/lib/supabase-admin.ts`): used as a question cache (`mcq_questions` table). When a game is created, `POST /api/game` first fetches cached questions from Supabase, generates missing ones from OpenAI, and back-fills the cache before writing the `Game` and `Question` rows to Postgres. This dual-database pattern means question generation is idempotent and cheap after the first call for a topic.

### Auth

NextAuth v4 with the Prisma adapter and Google provider. Session strategy is `database`. `getAuthSession()` (`src/lib/nextauth.ts`) is the server-side helper used in every route and page that needs the current user. The `session.user.id` field is injected via the `session` callback.

### API routes

All routes live in `src/app/api/`. Key ones:

| Route | Purpose |
|---|---|
| `POST /api/game` | Create a game: fetch/generate MCQ questions, write to Prisma |
| `POST /api/checkAnswer` | Validate one answer, write `userAnswer`/`isCorrect`, upsert `UserQuestionProgress` |
| `POST /api/endGame` | Stamp `timeEnded` on a game |
| `POST /api/quiz/questions` | Fetch questions for a game (used by quiz UI) |
| `GET  /api/game/mistakes` | Return questions the user got wrong (needs review) |

Zod schemas for all request/response shapes live in `src/schemas/form/quiz.ts`.

### AI question generation

`src/lib/gpt.ts` exports `strict_output`, a wrapper around OpenAI that retries JSON parsing up to 3 times. The active game creation route (`/api/game`) uses `src/lib/openai.ts` (direct OpenAI client) with `response_format: { type: "json_object" }` instead. Default model: `process.env.OPENAI_MODEL ?? "gpt-4o"`.

### Gamification

XP and levels are tracked on the `User` model (`xp`, `level` fields). The XP helper is at `src/lib/xp.ts`. The dashboard reads these with `getLevelProgress(totalXp)`. XP is awarded on quiz completion.

### Frontend patterns

- **UI components**: shadcn/ui primitives in `src/components/ui/`. Custom components in `src/components/` and `src/components/dashboard/`.
- **Styling**: Tailwind CSS v4 (PostCSS plugin, no `tailwind.config.js`).
- **Animations**: Framer Motion.
- **Forms**: react-hook-form + Zod via `@hookform/resolvers`.
- **Data fetching**: TanStack Query v5 for client-side fetching in quiz play components.
- **Theme**: next-themes via `ThemeProvider`.

### Environment variables required

```
DATABASE_URL              # Supabase Postgres (pooler URL for Prisma)
DIRECT_URL                # Direct Postgres URL (for migrations)
NEXT_PUBLIC_SUPABASE_URL  # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY # Supabase service role key (server-only)
AUTH_GOOGLE_ID            # Google OAuth client ID
AUTH_GOOGLE_SECRET        # Google OAuth client secret
NEXTAUTH_SECRET           # NextAuth secret
NEXTAUTH_URL              # App base URL
OPENAI_API_KEY            # OpenAI API key
OPENAI_MODEL              # (optional) defaults to gpt-4o
```
