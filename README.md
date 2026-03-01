# Trading Journal

Personal web app to track an FTMO challenge, manage risk, and reinforce trading discipline.

**Stack:** React + Vite + TypeScript + Tailwind + shadcn/ui + Hono + Notion API

---

## How it works

Notion is the database. The Hono server is a mandatory proxy — the Notion API doesn't accept direct browser requests (CORS). In production (Phase 2), the Hono server becomes Vercel Edge Functions.

```
React SPA (Vite)  →  /api/*  →  Hono server  →  @notionhq/client  →  Notion API
```

---

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` with your Notion integration token and database IDs:

```bash
NOTION_TOKEN=secret_xxxxx
NOTION_DB_TRADES=...
NOTION_DB_JOURNALS=...
NOTION_DB_INSTRUMENTS=...
NOTION_DB_RULES=...
NOTION_DB_DAILY_ROUTINES=...
NOTION_DB_WEEKLY_REVIEWS=...
```

> See `docs/NOTION-SCHEMA.md` for the full schema — some properties need to be added manually in Notion before running the app.

### 3. Run

```bash
pnpm dev          # Vite (localhost:5173) + Hono server (localhost:3001) in parallel
```

Or separately:

```bash
pnpm dev:web      # frontend only
pnpm dev:server   # backend only
```

---

## Features

| Page | Description |
|---|---|
| **Dashboard** | Equity curve, daily P&L, FTMO progress bars, recent trades |
| **Trade Log** | Full trade history, sortable and filterable |
| **Log Trade** | 5-step wizard — pre-trade note and checklist are mandatory |
| **Risk Calculator** | Live position sizing → "Register Trade" pre-fills the wizard |
| **Analytics** | Win rate, P&L by instrument, mistake breakdown, R:R distribution |
| **Routine Tracker** | Daily checklist, streak counter, weekly review |
| **Settings** | Account config, instrument management, data export |

---

## Project structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components (do not edit directly)
│   └── dashboard/    # Dashboard-specific components
├── hooks/            # TanStack Query hooks
├── lib/
│   ├── api.ts        # HTTP client → /api/*
│   ├── calculations.ts  # Risk math (unit-tested)
│   ├── checklist.ts  # Hardcoded pre-trade rules
│   └── schema.ts     # Zod schemas
├── pages/            # One file per route
└── stores/           # Zustand UI state

server/
├── notion/           # Pure Notion functions (no Hono dependency)
└── routes/           # Hono route handlers
```

---

## Commands

```bash
pnpm dev              # start frontend + backend
pnpm build            # production build
pnpm lint             # ESLint
npx vitest            # unit tests
npx playwright test   # E2E tests
```

---

## Phases

- **Phase 1 (current):** local MVP, no auth, Notion as database
- **Phase 2:** deploy to Vercel + Google OAuth (single user, email whitelist)

See `PLAN.md` for the full roadmap and `docs/STATUS.md` for current progress.
