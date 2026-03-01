# Architecture Diagrams

---

## 1. System Overview — Phase 1 (Local)

```mermaid
graph TB
    subgraph Browser["Browser — localhost:5173"]
        UI[React SPA]
        TQ[TanStack Query]
        ZS[Zustand Store]
        UI --> TQ
        UI --> ZS
    end

    subgraph Vite["Vite Dev Server"]
        PROXY["/api/* proxy"]
    end

    subgraph Hono["Hono Server — localhost:3001"]
        R_TRADES["/api/trades"]
        R_ACCOUNTS["/api/accounts"]
        R_INSTRUMENTS["/api/instruments"]
        R_STATS["/api/stats/dashboard"]
        R_UPLOAD["/api/upload-image"]
    end

    subgraph NotionLayer["server/notion/"]
        N_TRADES[trades.ts]
        N_ACCOUNTS[accounts.ts]
        N_INSTRUMENTS[instruments.ts]
        N_HELPERS[helpers.ts]
    end

    subgraph NotionAPI["Notion API — cloud"]
        DB_TRADES[(Trades)]
        DB_JOURNALS[(Journals / Accounts)]
        DB_INSTRUMENTS[(Instruments)]
        DB_RULES[(Rules)]
        DB_ROUTINES[(DailyRoutines)]
        DB_REVIEWS[(WeeklyReviews)]
    end

    TQ -->|fetch /api/*| PROXY
    PROXY -->|forward| Hono
    R_TRADES --> N_TRADES
    R_ACCOUNTS --> N_ACCOUNTS
    R_INSTRUMENTS --> N_INSTRUMENTS
    R_STATS --> N_TRADES & N_ACCOUNTS
    R_UPLOAD --> N_TRADES

    N_TRADES -->|notion client| DB_TRADES
    N_ACCOUNTS -->|notion client| DB_JOURNALS
    N_INSTRUMENTS -->|notion client| DB_INSTRUMENTS
    N_HELPERS -.->|used by| N_TRADES & N_ACCOUNTS & N_INSTRUMENTS
```

---

## 2. System Overview — Phase 2 (Production)

```mermaid
graph TB
    subgraph User["User — any device"]
        BR[Browser]
    end

    subgraph Vercel["Vercel"]
        CDN["CDN\nStatic React build"]
        subgraph Edge["Edge Functions — /api/*"]
            AUTH[JWT Auth Middleware]
            ROUTES[Hono Routes\nsame code as Phase 1]
        end
    end

    subgraph Google["Google"]
        OAUTH[OAuth 2.0]
    end

    subgraph NotionAPI["Notion API — cloud"]
        DBS[(Databases\nunchanged from Phase 1)]
    end

    BR -->|"GET /"| CDN
    CDN -->|"static assets"| BR
    BR -->|"GET /api/*"| AUTH
    AUTH -->|"401 if not authenticated"| BR
    AUTH -->|"pass"| ROUTES
    BR <-->|"OAuth flow\n/api/auth/google"| OAUTH
    OAUTH -->|"JWT session cookie"| BR
    ROUTES -->|"notion client\nNOTION_TOKEN env var"| DBS
```

---

## 3. Frontend Data Flow

```mermaid
graph LR
    subgraph Component["React Component"]
        PAGE[Page / Component]
    end

    subgraph Hooks["src/hooks/"]
        HK["useDashboard()\nuseTrades()\netc."]
    end

    subgraph Lib["src/lib/"]
        API[api.ts\nfetch wrappers]
        CALC[calculations.ts\npure math]
        SCHEMA[schema.ts\nZod validation]
    end

    subgraph Store["src/stores/"]
        UI[uiStore.ts\nZustand]
    end

    subgraph Cache["TanStack Query Cache"]
        CACHE[In-memory cache\nstaleTime / refetchInterval]
    end

    PAGE --> HK
    PAGE --> UI
    HK --> CACHE
    CACHE -->|cache miss| API
    API -->|HTTP fetch| SRV["/api/* → Hono"]
    API -->|response| SCHEMA
    SCHEMA -->|typed data| HK
    PAGE --> CALC
```

---

## 4. Risk Calculator → Register Trade Flow

```mermaid
sequenceDiagram
    actor User
    participant RC as RiskCalculator.tsx
    participant Calc as calculations.ts
    participant Router as React Router
    participant LT as LogTrade.tsx wizard

    User->>RC: inputs Entry, SL, TP, Account, Instrument
    RC->>Calc: positionSize(balance, riskPct, entry, sl, pipValue)
    Calc-->>RC: lots
    RC->>Calc: riskAmount(balance, riskPct)
    Calc-->>RC: $ at risk
    RC->>Calc: rrRatio(entry, sl, tp)
    Calc-->>RC: R:R ratio
    RC-->>User: display Position Size / Risk $ / Risk % / R:R

    User->>RC: clicks "Register Trade"
    RC->>Router: navigate('/log-trade', { state: { prefill: values } })
    Router->>LT: mount with prefill state

    Note over LT: Step 1 — Instrument + Direction (pre-filled)
    Note over LT: Step 2 — Entry / SL / TP (pre-filled)
    Note over LT: Step 3 — Size / Risk (pre-filled, read-only)
    User->>LT: Step 4 — writes Pre-Trade Note (required)
    User->>LT: Step 5 — Setup type + Checklist (required)
    LT->>LT: validate checklist score > 0
    LT->>LT: POST /api/trades
```

---

## 5. Log Trade Wizard — Step Flow

```mermaid
stateDiagram-v2
    [*] --> Step1 : open /log-trade

    Step1 : Step 1\nInstrument + Direction
    Step2 : Step 2\nEntry / SL / TP
    Step3 : Step 3\nPosition Size + Risk\n(auto-calculated)
    Step4 : Step 4\nPre-Trade Note\n⚠ required
    Step5 : Step 5\nSetup Type + Checklist\n⚠ required
    Submit : POST /api/trades
    Done : redirect → Trade Log

    Step1 --> Step2 : next
    Step2 --> Step1 : back
    Step2 --> Step3 : next
    Step3 --> Step2 : back
    Step3 --> Step4 : next
    Step4 --> Step3 : back
    Step4 --> Step5 : note filled
    Step5 --> Step4 : back
    Step5 --> Submit : checklist complete
    Submit --> Done : 201 Created
    Submit --> Step5 : error
```

---

## 6. Server Internal Structure

```mermaid
graph TB
    subgraph Routes["server/routes/ — Hono handlers"]
        RT[trades.ts]
        RA[accounts.ts]
        RI[instruments.ts]
        RS[stats.ts]
        RU[upload route]
    end

    subgraph Notion["server/notion/ — pure Notion logic"]
        NT[trades.ts\nlistTrades / createTrade\nupdateTrade / getTrade]
        NA[accounts.ts\nlistAccounts / getAccount]
        NI[instruments.ts\nlistInstruments]
        NC[client.ts\nnew Client NOTION_TOKEN]
        NH[helpers.ts\nnum / select / richText\ntitleText / dateStart]
    end

    subgraph NotionAPI["Notion API"]
        QDB[databases.query]
        CP[pages.create]
        UP[pages.update]
        FU[file_uploads]
    end

    RT --> NT
    RA --> NA
    RI --> NI
    RS --> NT & NA
    RU --> NT

    NT --> NC
    NA --> NC
    NI --> NC
    NT -.->|uses| NH
    NA -.->|uses| NH
    NI -.->|uses| NH

    NC --> QDB & CP & UP & FU
```

---

## 7. Image Upload Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as POST /api/upload-image
    participant N1 as Notion FileUpload API
    participant N2 as Notion Pages API

    FE->>API: FormData { file, tradeId }
    API->>N1: POST file_uploads\n{ file content, filename, mime_type }
    N1-->>API: { id: file_upload_id, expiry: +1h }
    API->>N2: pages.update(tradeId)\nproperties.Screenshots = [{ file_upload: { id } }]
    N2-->>API: updated page
    API-->>FE: 200 OK

    Note over N1,N2: file_upload_id expires in 1 hour\nmust attach before expiry
```

---

## 8. FTMO Dashboard Metrics Calculation

```mermaid
flowchart TD
    START([GET /api/stats/dashboard?accountId=...])
    ACC[fetch Account from Notion\nstartBalance / profitTargetPct\nmaxDailyLossPct / maxOverallLossPct]
    TRADES[fetch all Trades for account]

    START --> ACC & TRADES

    ACC & TRADES --> FILTER

    FILTER{filter trades}
    FILTER -->|status=Closed| CLOSED[closed trades]
    FILTER -->|openDate = today| TODAY[today's trades]

    CLOSED --> EQUITY[equity curve\nstartBalance + cumulative PnL\nper close date]
    CLOSED --> FTMO[FTMO progress\nprofitPct / dailyLossUsedPct\noverallLossUsedPct / tradingDays]
    CLOSED --> WR_ALL[overall win rate]
    TODAY --> WR_TODAY[today win rate]
    TODAY --> PNL_TODAY[today P&L]
    CLOSED --> RECENT[last 5 trades]

    EQUITY & FTMO & WR_ALL & WR_TODAY & PNL_TODAY & RECENT --> RESP[JSON response\nto Dashboard.tsx]
```
