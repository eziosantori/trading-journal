# Project Status

**Last updated:** 2026-02-28
**Current phase:** Pre-development — planning complete

---

## Phase Summary

| Phase | Status | Description |
|---|---|---|
| Phase 0: Planning | ✅ Done | PLAN.md, docs/*, Notion schema defined |
| Phase 1: Local MVP | ⏳ Not started | React + Hono + Notion API, localhost |
| Phase 2: CDN + Auth | ⏳ Not started | Vercel deploy, JWT auth |

---

## Phase 1 — Checklist

### Project Setup
- [ ] `npm create vite@latest trading-journal -- --template react-ts`
- [ ] Install dependencies: Tailwind, shadcn/ui, Hono, @notionhq/client, TanStack Query, Zustand, React Router, React Hook Form, Zod, Recharts, date-fns
- [ ] Configure `vite.config.ts` (proxy `/api/*` → `localhost:3001`)
- [ ] Create `server/` with Hono entry point
- [ ] Create `.env` and `.env.example` with all Notion database IDs

### Notion: Prepare the Databases

> Must be done directly on notion.so before starting development

- [ ] Add to **Trades**: `SL`, `TP`, `ATR14`, `RR_Ratio`, `Leverage`, `RiskAmount`, `PreTradeNote`, `LessonLearned`, `Mistakes` (multi-select), `ChecklistScore`, `Screenshots` (files)
- [ ] Add to **Journals**: `StartBalance`, `Currency`, `ChallengeType`, `ProfitTargetPct`, `MaxDailyLossPct`, `MaxOverallLossPct`, `MinTradingDays`
- [ ] Add to **Instruments**: `ATR14`, `ATRUpdatedAt`
- [ ] Create **Rules** database with Ezio's 10 default rules (see NOTION-SCHEMA.md)
- [ ] Create **DailyRoutines** database
- [ ] Create **WeeklyReviews** database
- [ ] Create a Notion integration and obtain `NOTION_TOKEN`
- [ ] Copy the 6 database IDs into `.env`
- [ ] Replace sample data: add real FTMO #7489666 account + US100 and XAUUSD instruments

### Backend (server/)
- [ ] `server/notion/client.ts` — @notionhq/client setup
- [ ] `server/notion/trades.ts` — listTrades, getTrade, createTrade, updateTrade
- [ ] `server/notion/accounts.ts` — listAccounts, getAccount
- [ ] `server/notion/instruments.ts` — listInstruments, getInstrument
- [ ] `server/notion/rules.ts` — listRules
- [ ] `server/notion/stats.ts` — dashboard metric aggregations
- [ ] `server/notion/files.ts` — screenshot upload via FileUpload API
- [ ] Hono routes for all endpoints
- [ ] Notion pagination handling (has_more + next_cursor)

### Frontend Core
- [ ] App shell: layout with sidebar, header, React Router routing
- [ ] TanStack Query hooks: `useTrades`, `useAccount`, `useInstruments`, `useStats`
- [ ] `src/lib/calculations.ts`: `positionSize()`, `riskAmount()`, `riskPercent()`, `rrRatio()`
- [ ] `src/lib/checklist.ts`: hardcoded generic + setup-specific rules

### Pages
- [ ] **Dashboard** — equity curve, daily metrics, FTMO progress bars, last 5 trades
- [ ] **Trade Log** — table + filters (date, instrument, direction, setup) + CSV export
- [ ] **Log Trade** — 5-step wizard with mandatory pre-trade note and checklist
- [ ] **Risk Calculator** — live calculation + "Register Trade" button → pre-fill wizard
- [ ] **Analytics** — win rate, P&L by instrument, mistakes breakdown, R:R distribution
- [ ] **Routine Tracker** — daily checklist, streak counter, weekly review
- [ ] **Settings** — FTMO account, instruments (ATR), active rules

### Testing
- [ ] Unit tests for `calculations.ts` with Vitest
- [ ] Unit tests for Zod schemas
- [ ] E2E: Risk Calculator → Register Trade full flow
- [ ] E2E: Dashboard loads with data

---

## Phase 2 — Checklist

- [ ] Create Vercel project
- [ ] Adapt Hono routes for Vercel Edge Functions (or use `@hono/vercel`)
- [ ] Create Google OAuth 2.0 Client ID in Google Cloud Console
- [ ] Add `@hono/oauth-providers` and implement `/api/auth/google` + `/api/auth/google/callback` routes
- [ ] Add JWT session middleware (signs a cookie after successful Google login)
- [ ] Set `ALLOWED_EMAIL` to restrict access to Ezio's Google account only
- [ ] Configure all env vars in Vercel dashboard (`NOTION_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAIL`, `AUTH_SECRET`)
- [ ] Configure Google Cloud Console: add Vercel domain to allowed redirect URIs
- [ ] Configure `VITE_API_URL` to point to Vercel in production
- [ ] Custom domain
- [ ] Production smoke test

---

## Open Decisions

| Topic | Status | Notes |
|---|---|---|
| Phase 2 auth library | ✅ Decided | Google OAuth via `@hono/oauth-providers` + JWT session cookie |
| Partial closes structure | 🔵 TBD | JSON in Rich Text or separate database? |
| Real FTMO data | ⚠️ Pending | Delete sample data (AAPL, EUR/USD, TSLA, Fidelity, etc.) and enter real account + instruments |
| Notion database naming | ⚠️ Verify | "Journals" → rename to "Accounts" for clarity? |
| Finviz Reports | 🔵 Future | Not included in Phase 1 or 2 |

---

## External Dependencies

| Service | Phase | Status |
|---|---|---|
| Notion Workspace | 1 | ✅ Exists |
| Notion Integration Token | 1 | ⏳ To be created |
| Vercel Account | 2 | ⏳ To be created |
| Custom domain | 2 | ⏳ Optional |
