# Project Status

**Last updated:** 2026-03-02
**Current phase:** Phase 1 — in progress

---

## Phase Summary

| Phase | Status | Description |
|---|---|---|
| Phase 0: Planning | ✅ Done | PLAN.md, docs/*, Notion schema defined |
| Phase 1: Local MVP | 🔄 In progress | React + Hono + Notion API, localhost |
| Phase 2: CDN + Auth | ⏳ Not started | Vercel deploy, JWT auth |

---

## Phase 1 — Checklist

### Project Setup
- [x] Vite + React + TypeScript scaffold
- [x] Dependencies: Tailwind, shadcn/ui, Hono, @notionhq/client, TanStack Query, Zustand, React Router, React Hook Form, Zod, Recharts
- [x] `vite.config.ts` proxy `/api/*` → `localhost:3001`
- [x] `server/` with Hono entry point
- [x] `.env` and `.env.example` with all Notion database IDs

### Notion: Prepare the Databases
- [x] Add to **Trades**: `SL`, `TP`, `ATR14`, `RR_Ratio`, `Leverage`, `RiskAmount`, `PreTradeNote`, `LessonLearned`, `Mistakes`, `ChecklistScore`, `Screenshots`
- [x] Add to **Journals**: `StartBalance`, `Currency`, `ChallengeType`, `ProfitTargetPct`, `MaxDailyLossPct`, `MaxOverallLossPct`, `MinTradingDays`
- [x] Add to **Instruments**: `ATR14`, `ATRUpdatedAt`
- [ ] Create **Rules** database with Ezio's 10 default rules
- [ ] Create **DailyRoutines** database
- [ ] Create **WeeklyReviews** database
- [x] Notion integration token obtained
- [x] All 6 database IDs in `.env`
- [ ] Replace sample data: real FTMO #7489666 account + US100/XAUUSD instruments

### Backend (server/)
- [x] `server/notion/client.ts`
- [x] `server/notion/trades.ts` — listTrades, getTrade, createTrade, updateTrade
- [x] `server/notion/accounts.ts` — listAccounts, getAccount
- [x] `server/notion/instruments.ts` — listInstruments, getInstrument
- [x] `server/notion/helpers.ts` — property mappers
- [x] `server/routes/trades.ts`, accounts.ts, instruments.ts, rules.ts, stats.ts
- [x] `server/routes/stats.ts` — dashboard metrics endpoint
- [ ] `server/notion/files.ts` — screenshot upload via FileUpload API
- [ ] Notion pagination handling (has_more + next_cursor)

### Frontend Core
- [x] App shell: sidebar + React Router routing
- [x] `src/lib/calculations.ts`
- [x] `src/lib/checklist.ts`
- [x] `src/lib/schema.ts` — Zod schemas
- [x] `src/lib/api.ts` — fetch wrappers
- [x] `src/stores/uiStore.ts` — Zustand
- [x] `src/hooks/useDashboard.ts`
- [x] `src/hooks/useTrades.ts`
- [ ] `src/hooks/useInstruments.ts`

### Pages
- [x] **Dashboard** — equity curve, daily metrics, FTMO progress, recent trades
- [x] **Risk Calculator** — live calculation + "Register Trade" → pre-fill wizard
- [x] **Trade Log** — table + filters + CSV export
- [ ] **Log Trade** — 5-step wizard (pre-trade note + checklist mandatory)
- [ ] **Analytics** — win rate, P&L by instrument, mistakes, R:R
- [ ] **Routine Tracker** — daily checklist, streak, weekly review
- [ ] **Settings** — account config, instruments, active rules

### Testing — Unit (Vitest)

Strategy: cover pure business logic only. No DOM, no live Notion connection.

- [ ] `src/lib/calculations.test.ts`
  - `riskAmount` — base formula, edge case balance=0
  - `riskPercent` — inverse of riskAmount, guard division by zero
  - `positionSize` — size calculation, edge case slDistance=0, pipValue=0
  - `rrRatio` — Long/Short, edge case risk=0
  - `atrStopLoss` — Long and Short directions
  - `tradePnL` — profitable and losing trades for both directions
  - `isRiskWithinLimit` — default 2% limit and custom limit
- [ ] `src/lib/checklist.test.ts`
  - `getChecklist` — correct rule count for each setup type
  - `getChecklist` — G12 included only when `isOfficeDay=true`
  - `getChecklist` — correct setup-specific rules (spot check 1-2 per setup)
- [ ] `src/lib/schema.test.ts`
  - `CreateTradeSchema` — rejects empty `preTradeNote` (critical business rule)
  - `CreateTradeSchema` — rejects `riskPercent > 10`
  - `CreateTradeSchema` — rejects negative values for entry/sl/size
  - `UpdateTradeSchema` — all fields optional, empty object is valid
- [ ] `server/notion/helpers.test.ts`
  - Notion property mappers → domain types (trade, account, instrument) with mock data
  - Edge case: missing/null Notion properties → correct nullable domain values

### Testing — E2E (Playwright)
- [ ] Risk Calculator → Register Trade: pre-filled values in wizard
- [ ] Dashboard: FTMO metrics load with mock server data

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
