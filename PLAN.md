# Trading Journal Web App — Development Plan

> **Guiding principle:** Keep It Simple. Every technical decision should reduce complexity, not add it.

## Overview

Personal web app to track the FTMO challenge, manage risk, and reinforce trading discipline.

**User:** Ezio — FTMO Challenge #7489666 — ~$193,564
**Style:** Swing trading on 1h timeframe, focus on US100 and Gold
**Key problems:** Overtrading (max 3 trades/day), revenge trading, too many instruments (max 2)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| UI | Tailwind CSS 3 + shadcn/ui |
| Charts | Recharts 2 |
| Forms | React Hook Form 7 + Zod 3 |
| Routing | React Router 6 |
| Async state | TanStack Query v5 |
| Global state | Zustand |
| Backend (proxy) | Hono (Node.js local / Vercel Edge in production) |
| Database | **Notion API** (`@notionhq/client`) |
| Testing | Vitest (unit) + Playwright (E2E) |

---

## Architecture by Phase

### Phase 1 — Local MVP (no auth)

```
Browser (localhost:5173)
        │
        ▼  /api/*
Hono server (localhost:3001)   ← NOTION_TOKEN in .env
        │
        ▼
Notion API (cloud)
        │
        ▼
Notion Databases (Trades, Journals, Instruments, Rules)
```

The Hono server is mandatory: the Notion API does not accept direct browser requests (CORS). The Vite dev server proxies requests to `localhost:3001`.

**Deliverable:** working app at `localhost:5173`, data stored in Notion.

---

### Phase 2 — CDN + Auth

```
Browser → Vercel CDN (static React build)
                │
                ▼  /api/*  (same Hono routes)
Vercel Edge Functions + JWT auth middleware
                │  NOTION_TOKEN in Vercel env vars
                ▼
Notion API (cloud)
```

The only change from Phase 1 is deploying the Hono server to Vercel Edge Functions and adding an auth middleware. Notion code is unchanged.

**Deliverable:** hosted app, JWT-protected, accessible from any device.

---

## Project Structure

```
trading-journal/
├── src/                      # React frontend
│   ├── components/
│   │   ├── ui/               # shadcn/ui (do not edit directly)
│   │   ├── trade/            # TradeForm, TradeRow, TradeTable
│   │   ├── analytics/        # EquityCurve, WinRateChart, MistakeChart
│   │   ├── risk/             # RiskCalculator
│   │   └── routine/          # RoutineChecklist, StreakCounter
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── TradeLog.tsx
│   │   ├── LogTrade.tsx      # 5-step wizard
│   │   ├── RiskCalculator.tsx
│   │   ├── Analytics.tsx
│   │   ├── Routine.tsx
│   │   └── Settings.tsx
│   ├── lib/
│   │   ├── api.ts            # HTTP client → /api/*
│   │   ├── schema.ts         # Zod schemas (form validation)
│   │   ├── calculations.ts   # risk/P&L/position math (unit-tested)
│   │   ├── checklist.ts      # hardcoded pre-trade checklist rules
│   │   └── utils.ts
│   ├── hooks/                # useTrades, useAccount, useInstruments
│   └── App.tsx
├── server/                   # Hono backend
│   ├── routes/
│   │   ├── trades.ts
│   │   ├── accounts.ts
│   │   ├── instruments.ts
│   │   └── rules.ts
│   ├── notion/
│   │   ├── client.ts         # @notionhq/client setup
│   │   ├── trades.ts         # Notion CRUD operations for trades
│   │   ├── accounts.ts
│   │   └── instruments.ts
│   └── index.ts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── NOTION-SCHEMA.md
│   ├── CHECKLIST-RULES.md
│   └── STATUS.md
├── notion_db/                # Notion CSV exports (schema reference)
├── .env                      # NOTION_TOKEN, DB IDs (do not commit)
├── .env.example
├── package.json
├── vite.config.ts            # proxy /api/* → localhost:3001
├── tailwind.config.js
└── tsconfig.json
```

---

## Core Features

### 1. Dashboard
- Equity curve (Recharts)
- Daily metrics card: trades, P&L, win rate
- FTMO progress bars: profit target (10%), daily loss (5%), overall loss (10%)
- Last 5 trades table
- Rule violation alert (if any today)
- Quick actions: "Log Trade", "Risk Calculator"

### 2. Trade Log
- Full trade history table, sortable and filterable (date, instrument, direction, setup)
- Export to CSV
- Click row → detail view + edit "Lesson Learned"
- **Partial close modal** on Open/Partial rows: insert exit price + size → UI calculates P&L live
  - Button label: "Chiudi parzialmente" if size < remaining, "Chiudi trade" if size = remaining
  - On final close: UI sums all partial P&Ls → writes total `pnl`, `status: Closed`, `closeDate`
  - Partial closes stored as JSON in `PartialCloses` Rich Text field (Option A, decided)
  - Expanded row shows timeline of partial closes with date, size, exit price, P&L per close

### 3. Log Trade — 5-Step Wizard
1. Instrument + Direction
2. Entry, SL, TP (with inline ATR calculator)
3. Position size (auto-calculated from `calculations.ts`)
4. **Pre-trade note** (mandatory — cannot proceed without it)
5. **Pre-trade checklist** (mandatory — see `docs/CHECKLIST-RULES.md`)

> The form cannot be submitted without a pre-trade note and a completed checklist.

### 4. Risk Calculator → Register Trade

Flow:
1. User inputs: Account, Instrument, Entry, SL, (optional: TP, ATR)
2. System calculates in real time: Position Size, Risk $, Risk %, R:R
3. **"Register Trade"** button → navigates to LogTrade wizard pre-filled with calculated values
4. User only needs to complete: pre-trade note, checklist, setup type

Pre-filled fields: Instrument, Entry, SL, TP, Position Size, Risk %, R:R ratio.

### 5. Analytics
- Win rate trend (weekly/monthly)
- P&L by instrument (bar chart)
- Mistakes breakdown (pie chart)
- R:R distribution (histogram)
- Trade heatmap by day/hour

### 6. Routine Tracker
- Daily checklist (morning/evening)
- Streak counter (days with complete routine)
- Weekly review form (auto-prompted every Friday)

### 7. Settings
- FTMO account configuration (balance, thresholds)
- Instrument management (ATR, leverage, market hours)
- Active rules view
- Data export/import

---

## Trade Screenshots

**Supported via Notion API.**

Each Trades database page can have a `Screenshots` property of type **Files & Media**. The flow is:
1. Upload file via Notion FileUpload API → returns a `file_upload_id`
2. Attach the `file_upload_id` to the `Screenshots` property of the trade page

Limits: 5 MB per file on Free plan, up to 5 GB on paid plans. Files must be attached within 1 hour of upload.

---

## Pre-Trade Checklist

**Generic rules** (all trades) + **setup-specific rules** (hardcoded in v1).
Full documentation in `docs/CHECKLIST-RULES.md`.

Supported setups (hardcoded v1):
- Trend Following
- Pullback to S/R
- Breakout
- Range Trading
- Mean Reversion

---

## Trading Rules (Ezio defaults)

Stored in the Notion `Rules` database:

| # | Rule | Reason |
|---|------|--------|
| 1 | Max 3 trades per day | Avoid overtrading |
| 2 | Max 2 instruments | Focus and mastery |
| 3 | Min 2h between trades | Avoid revenge trading |
| 4 | Stop after 2 consecutive losses | Capital protection |
| 5 | 1h timeframe only | Swing consistency |
| 6 | No trades on office days (or max 1) | Work compatibility |
| 7 | Write pre-trade note BEFORE entering | Awareness |
| 8 | Never move the stop loss | Risk management |
| 9 | Max 1–2% risk per trade | Survival |
| 10 | ATR-based SL (min 1.5×) | Technical, not arbitrary |

---

## Notion Database Schema

Full schema in `docs/NOTION-SCHEMA.md`.

Existing databases (need new properties added):
- **Trades** — full trade log
- **Journals** — trading accounts
- **Instruments** — instruments with technical parameters

Databases to create:
- **Rules** — trading rules
- **DailyRoutines** — daily checklists and metrics
- **WeeklyReviews** — weekly reflections

---

## Environment Variables

```bash
# .env (Phase 1 — local)
NOTION_TOKEN=secret_xxxxx
NOTION_DB_TRADES=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_JOURNALS=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_INSTRUMENTS=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_RULES=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_DAILY_ROUTINES=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_WEEKLY_REVIEWS=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Phase 2 — add (Vercel environment variables)
GOOGLE_CLIENT_ID=xxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxx
ALLOWED_EMAIL=ezio@gmail.com   # only this Google account can log in
AUTH_SECRET=xxxxxxx            # used to sign the JWT session cookie
```

---

## Testing

**Principle:** cover pure business logic. Do not chase coverage percentages.

### Unit (Vitest) — what to test

| File | Why |
|---|---|
| `src/lib/calculations.ts` | Risk management math — bugs here cost real money |
| `src/lib/checklist.ts` | Hardcoded pre-trade rules — `getChecklist()` must return the right items |
| `src/lib/schema.ts` | Data validation — `preTradeNote` required, `riskPercent ≤ 10`, positive values |
| `server/notion/helpers.ts` | Notion → domain mappers — corrupt data here breaks the entire UI |

**Do NOT test:** React components, TanStack Query hooks, config files, Zustand store.

### E2E (Playwright) — critical flows

- Risk Calculator → "Register Trade" → wizard pre-filled with calculated values
- Dashboard: FTMO metrics load correctly with mock server

### Rules

- Unit tests must not touch the network or Notion (mock the client)
- Test file lives next to the source: `calculations.ts` → `calculations.test.ts`
- A failing test in `calculations.ts` blocks the merge

---

## Development Phases

### Phase 1 — Local MVP

**Project setup**
- [ ] `npm create vite@latest` with React + TypeScript template
- [ ] Install and configure Tailwind + shadcn/ui
- [ ] Set up Hono server in `server/`
- [ ] Configure Vite proxy for `/api/*` → `localhost:3001`
- [ ] Create `.env` with Notion token and database IDs

**Notion: update existing databases**
- [ ] Add missing properties to Trades (see `docs/NOTION-SCHEMA.md`)
- [ ] Add missing properties to Journals/Accounts
- [ ] Add ATR14 + ATRUpdatedAt to Instruments
- [ ] Create Rules database with Ezio's 10 default rules
- [ ] Create DailyRoutines database
- [ ] Create WeeklyReviews database

**Backend**
- [ ] Notion client setup (`server/notion/client.ts`)
- [ ] CRUD trades
- [ ] CRUD accounts
- [ ] CRUD instruments
- [ ] Read rules
- [ ] Dashboard stats/metrics endpoint
- [ ] Image upload endpoint (Notion FileUpload API)

**Frontend**
- [ ] App shell: layout, sidebar, routing
- [ ] Dashboard
- [ ] Trade Log (table + filters)
- [ ] Log Trade wizard
- [ ] Risk Calculator (+ "Register Trade")
- [ ] Analytics
- [ ] Routine Tracker
- [ ] Settings

**Testing**
- [ ] Unit: `calculations.ts` — all functions with edge cases
- [ ] Unit: `checklist.ts` — getChecklist(), conditional G12 rule
- [ ] Unit: `schema.ts` — CreateTradeSchema (preTradeNote required, riskPercent max)
- [ ] Unit: `server/notion/helpers.ts` — Notion → domain mappers with mock data
- [ ] E2E: Risk Calculator → Register Trade (wizard pre-filled)
- [ ] E2E: Dashboard FTMO metrics load

---

### Phase 2 — CDN + Auth

- [ ] Deploy to Vercel (static frontend)
- [ ] Convert Hono server to Vercel Edge Functions (or use `@hono/vercel`)
- [ ] Create Google OAuth 2.0 Client ID in Google Cloud Console
- [ ] Add `@hono/oauth-providers` and implement Google OAuth flow
- [ ] Whitelist Ezio's Google email via `ALLOWED_EMAIL` env var
- [ ] Add JWT session middleware for subsequent requests (after Google callback)
- [ ] Configure all environment variables in Vercel dashboard
- [ ] Configure `VITE_API_URL` to point to Vercel in production
- [ ] Custom domain + HTTPS (configure redirect URI in Google Cloud Console)
- [ ] Production smoke test

---

## FTMO Metrics Tracked

- Profit Target Progress (% toward 10%)
- Daily Loss Remaining (% toward 5% limit)
- Overall Loss Remaining (% toward 10% limit)
- Trading Days Count (minimum 10)
- Status: On Track / At Risk / Failed

---

---

## Future Enhancements (post-Phase 1)

### Checklist: Setup Grade (A+, A, B, C, D)

Instead of a raw score (0–100%), assign a letter grade based on the percentage of checklist items checked. Proposed thresholds:

| Grade | Score | Meaning |
|---|---|---|
| A+ | 100% | Perfect setup — all conditions met |
| A  | 85–99% | Excellent — minor gaps |
| B  | 70–84% | Good — proceed with awareness |
| C  | 50–69% | Marginal — consider skipping |
| D  | < 50% | Poor — do not trade |

**Implementation notes:**
- Add a `gradeChecklist(score: number): string` pure function in `src/lib/checklist.ts`
- Display the grade badge next to the score in step 5 of the wizard
- Store only `checklistScore` (number) in Notion; grade is always derived at render time
- Show grade in Trade Log and Analytics (color-coded: A+/A = emerald, B = amber, C/D = red)

### Checklist in Risk Calculator (optional)

Add an expandable checklist panel to the Risk Calculator page. Rationale: the user can verify setup quality *before* committing to position sizing, not just at the end of the wizard.

**Behavior:**
- Collapsed by default (doesn't clutter the calculator)
- Requires Setup Type selection to activate
- Score/grade shown in the panel header once items are checked
- Checked state passed via `location.state` to the LogTrade wizard (step 5 pre-populated) — avoids re-doing the checklist in the wizard if already completed in the calculator

**Implementation notes:**
- Extract checklist UI from step 5 into a reusable `<ChecklistPanel setupType={...} />` component
- Wire into RiskCalculator with a `showChecklist` toggle state
- Add `checkedItems?: string[]` and `isOfficeDay?: boolean` to the prefill object passed to LogTrade

---

*Created: 2026-02-21 | Updated: 2026-03-05*
*For: Ezio — FTMO Challenge*
