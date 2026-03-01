# Architecture

## Guiding Principle

Minimal stack that works locally with no complex setup, and that moves to production with the fewest possible changes.

---

## Why Notion as the Database

- Ezio's existing Notion tracker already contains structured historical data (Trades, Journals, Instruments)
- No migration needed: the same tables become the backend
- Free automatic backup, multi-device sync, native visualization
- Official TypeScript client with documented REST API

**Main limitation:** the Notion API does not accept direct browser requests (no CORS). A proxy server is required.

---

## Local Architecture (Phase 1)

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                 │
│  React SPA (localhost:5173)                              │
│                                                          │
│  TanStack Query → fetch /api/*                           │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP (proxied by Vite)
┌──────────────────────────▼──────────────────────────────┐
│  Hono Server (localhost:3001)                            │
│                                                          │
│  GET /api/trades          →  notion/trades.ts            │
│  POST /api/trades         →  notion/trades.ts            │
│  GET /api/accounts        →  notion/accounts.ts          │
│  GET /api/instruments     →  notion/instruments.ts       │
│  GET /api/stats           →  notion/stats.ts             │
│  POST /api/upload-image   →  notion/files.ts             │
└──────────────────────────┬──────────────────────────────┘
                           │ @notionhq/client
                           │ NOTION_TOKEN (from .env)
┌──────────────────────────▼──────────────────────────────┐
│  Notion API (cloud)                                      │
│  Databases: Trades, Journals, Instruments, Rules, ...    │
└─────────────────────────────────────────────────────────┘
```

**Vite proxy:** in `vite.config.ts`, all `/api/*` requests are forwarded to `localhost:3001`:

```ts
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

---

## Production Architecture (Phase 2)

```
┌─────────────────────────────────────────────────────────┐
│  Vercel CDN                                              │
│  Static React build (dist/)                              │
└──────────────────────────┬──────────────────────────────┘
                           │ fetch /api/*
┌──────────────────────────▼──────────────────────────────┐
│  Vercel Edge Functions (api/*)                           │
│  Same Hono routes + JWT auth middleware                  │
│  NOTION_TOKEN in Vercel environment variables            │
└──────────────────────────┬──────────────────────────────┘
                           │ @notionhq/client
┌──────────────────────────▼──────────────────────────────┐
│  Notion API (same instance, no migration needed)         │
└─────────────────────────────────────────────────────────┘
```

**What changes between Phase 1 and Phase 2:**
- Hono routes are wrapped as Vercel Edge Functions (or using `@hono/vercel`)
- A JWT auth middleware is added before each protected route
- `NOTION_TOKEN` moves from `.env` to Vercel environment variables
- The frontend calls the same `/api/*` paths without any changes

---

## Server Structure (Hono)

```
server/
├── index.ts              # entry point, mounts all routes
├── notion/
│   ├── client.ts         # initializes Client({ auth: NOTION_TOKEN })
│   ├── trades.ts         # queryDatabase, createPage, updatePage for Trades
│   ├── accounts.ts       # operations on Journals/Accounts
│   ├── instruments.ts    # operations on Instruments
│   ├── rules.ts          # read-only Rules (v1)
│   ├── stats.ts          # metric aggregations (win rate, P&L, etc.)
│   └── files.ts          # FileUpload API for screenshots
└── routes/
    ├── trades.ts          # Hono handlers for /api/trades
    ├── accounts.ts
    ├── instruments.ts
    ├── rules.ts
    └── stats.ts
```

**Key pattern — `notion/` vs `routes/`:**

```ts
// server/notion/trades.ts — pure Notion logic, no Hono dependency
// Can be tested with a mocked Notion client
export async function listTrades(filters?: TradeFilters) {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DB_TRADES!,
    filter: buildFilter(filters),
    sorts: [{ property: 'OpenDate', direction: 'descending' }]
  });
  return response.results.map(mapNotionPageToTrade);
}

// server/routes/trades.ts — Hono handler, calls notion/trades.ts
app.get('/api/trades', async (c) => {
  const trades = await listTrades(c.req.query());
  return c.json(trades);
});
```

The `notion/*` / `routes/*` separation allows testing Notion logic with mocks without needing an HTTP server.

---

## Frontend Structure

```
src/
├── lib/
│   ├── api.ts            # fetch wrappers for /api/* endpoints
│   ├── calculations.ts   # pure functions: positionSize(), riskAmount(), rrRatio()
│   ├── schema.ts         # Zod schemas for each entity
│   ├── checklist.ts      # hardcoded pre-trade checklist rules
│   └── utils.ts          # formatCurrency, formatDate, etc.
├── hooks/
│   ├── useTrades.ts      # TanStack Query: useQuery + useMutation for trades
│   ├── useAccount.ts
│   └── useInstruments.ts
├── stores/
│   └── uiStore.ts        # Zustand: UI state (sidebar, open modals, active filters)
├── components/
│   ├── ui/               # shadcn/ui — DO NOT edit manually
│   ├── trade/
│   │   ├── TradeTable.tsx
│   │   ├── TradeForm.tsx         # 5-step wizard
│   │   └── TradeRow.tsx
│   ├── risk/
│   │   └── RiskCalculator.tsx    # calculates + "Register Trade" button
│   ├── analytics/
│   │   ├── EquityCurve.tsx
│   │   ├── WinRateChart.tsx
│   │   └── MistakeChart.tsx
│   └── routine/
│       └── RoutineChecklist.tsx
└── pages/                        # page-level components (React Router routes)
```

**Data flow:**
1. Each page uses a TanStack Query hook (`useTrades`, `useAccount`, etc.)
2. Hooks call functions in `lib/api.ts`
3. `api.ts` fetches `/api/*` (proxied to Hono in dev, Edge Functions in prod)
4. Responses are validated with Zod before being used in components

---

## Risk Calculator → Register Trade Flow

```
RiskCalculator.tsx
  ├── Input: Account, Instrument, Entry, SL, [TP, ATR]
  ├── Live calculation: calculations.ts
  │     positionSize(balance, riskPct, entry, sl, pipValue)
  │     riskAmount(balance, riskPct)
  │     rrRatio(entry, sl, tp)
  ├── Display: Position Size, Risk $, Risk %, R:R
  └── "Register Trade" button
        │
        ▼ navigate + state
LogTrade.tsx (wizard)
  ├── Step 1: Instrument + Direction  ← pre-filled
  ├── Step 2: Entry, SL, TP          ← pre-filled
  ├── Step 3: Position Size, Risk    ← pre-filled + read-only
  ├── Step 4: Pre-trade note         ← required
  └── Step 5: Setup type + Checklist ← required
```

Navigation uses React Router's `useNavigate` with `state` carrying the pre-calculated values:

```ts
navigate('/log-trade', { state: { prefill: calculatedValues } })
```

---

## Notion API — Operational Notes

**Rate limit:** 3 requests/second per integration. TanStack Query handles client-side caching to reduce calls.

**Pagination:** `databases.query()` returns max 100 results per call. For larger datasets, iterate over `has_more` + `next_cursor`. Implement in the backend.

**Property mapping:** Notion properties have a verbose nested structure. Each `notion/*.ts` file should expose `mapNotionPageTo<Entity>` and `map<Entity>ToNotionProperties` functions to centralize the mapping.

**Image upload flow:**
```
POST /api/upload-image
  1. notion.request({ path: 'file_uploads', method: 'POST', body: ... })
  → { id: file_upload_id, expiry_time: ... }  (must attach within 1 hour)
  2. notion.pages.update({
       page_id: trade_page_id,
       properties: {
         Screenshots: { files: [{ type: 'file_upload', file_upload: { id } }] }
       }
     })
```

---

## Architectural Decisions

| Decision | Choice | Reason |
|---|---|---|
| Database | Notion API | Data already exists, no migration needed |
| Proxy server | Hono | Lightweight, same code for Node.js and Vercel Edge |
| Auth (Phase 2) | JWT, single user | Personal app, no multi-user complexity needed |
| Async state | TanStack Query | Automatic caching, reduces Notion API calls |
| ORM | None | Simple manual mapping on Notion API |
| CSS | Tailwind + shadcn/ui | Speed, consistency, no custom CSS |
