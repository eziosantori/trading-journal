# Notion Database Schema

This document defines the complete structure of the Notion databases used as the application backend.

The databases `Trades`, `Journals` (Accounts), and `Instruments` already exist (see CSV files in `notion_db/`). Properties marked with ⚠️ **must be added manually in Notion** before starting development.

---

## 1. Trades

**Env var:** `NOTION_DB_TRADES`

| Property | Notion Type | Notes |
|---|---|---|
| `Name` | Title | Trade identifier (e.g. "US100-Long-2026-03-01") |
| `Direction` | Select | `Long` / `Short` |
| `EntryPrice` | Number | Entry price |
| `ExitPrice` | Number | Exit price (empty if trade is open) |
| `Size` | Number | Position size (lots / contracts / shares) |
| `PnL` | Number | Realized P&L in account currency |
| `Status` | Select | `Open` / `Closed` / `Partial` |
| `Strategy` | Select | Setup type — see values below |
| `Sentiment` | Select | Emotional state — see values below |
| `RiskPercent` | Number | Risk as % of capital (e.g. `1.5` = 1.5%) |
| `OpenDate` | Date | Trade open date/time |
| `CloseDate` | Date | Trade close date/time |
| `Notes` | Rich Text | General post-trade notes |
| `JournalId` | Relation | → Journals database (account used) |
| `InstrumentId` | Relation | → Instruments database |
| `PartialCloses` | Rich Text | JSON array of partial close events |
| `Tags` | Multi-select | Free-form labels |
| `SL` | Number | ⚠️ Stop Loss price |
| `TP` | Number | ⚠️ Take Profit price |
| `ATR14` | Number | ⚠️ ATR(14) value at time of trade |
| `RR_Ratio` | Number | ⚠️ Risk/Reward ratio (e.g. `2.5`) |
| `Leverage` | Number | ⚠️ Leverage used (default from instrument) |
| `RiskAmount` | Number | ⚠️ Risk in absolute currency (e.g. `193.56`) |
| `PreTradeNote` | Rich Text | ⚠️ **Required** — setup rationale before entry |
| `LessonLearned` | Rich Text | ⚠️ Post-trade reflection |
| `Mistakes` | Multi-select | ⚠️ See values below |
| `ChecklistScore` | Number | ⚠️ Number of checklist items completed |
| `Screenshots` | Files & Media | ⚠️ Trade screenshots (max 5 MB on Free plan) |
| `Timeframe` | Select | ⚠️ Operational timeframe — see values below (default `1h`) |
| `Spread` | Number | ⚠️ Spread at time of opening (in price units) |

### Select Values

**Strategy (Setup Type):**
- `Trend Following`
- `Pullback to S/R`
- `Breakout`
- `Range Trading`
- `Mean Reversion`

**Sentiment (Emotion):**
- `Calm`
- `Confident`
- `Neutral`
- `Uncertain`
- `Rushed`
- `Frustrated`

**Mistakes (Multi-select):**
- `FOMO`
- `Revenge Trading`
- `Overtrading`
- `No Pre-Trade Note`
- `Moved Stop Loss`
- `Ignored Checklist`
- `Wrong Position Size`
- `Traded Office Day`
- `Chased Entry`
- `Closed Too Early`
- `Excessive Risk`
- `Ignored Warnings`

**Timeframe:**
- `M5`, `M15`, `M30`, `1h`, `4h`, `D`, `W`

**Tags (from existing sample data):**
- `High Priority`
- `Short Term`
- `Swing Trade`
- `Day Trade`
- `Speculative`

---

## 2. Journals (Accounts)

**Env var:** `NOTION_DB_JOURNALS`

> This table contains trading accounts. The primary account is FTMO #7489666.

| Property | Notion Type | Notes |
|---|---|---|
| `Name` | Title | Account name (e.g. "FTMO #7489666") |
| `Broker` | Select | Broker / prop firm |
| `Balance` | Number | Current balance |
| `Date` | Date | Account creation / challenge start date |
| `Status` | Select | `Active` / `Closed` / `Failed` / `Passed` |
| `Category` | Select | `FTMO Challenge` / `Trading` / `Investment` / `Retirement` |
| `Description` | Rich Text | Account notes |
| `StartBalance` | Number | ⚠️ Initial balance (for equity curve calculation) |
| `Currency` | Select | ⚠️ `USD` / `EUR` — default `USD` |
| `ChallengeType` | Select | ⚠️ `FTMO` / `MyForexFunds` / `Personal` |
| `ProfitTargetPct` | Number | ⚠️ Profit target % (FTMO: `10`) |
| `MaxDailyLossPct` | Number | ⚠️ Max daily loss % (FTMO: `5`) |
| `MaxOverallLossPct` | Number | ⚠️ Max overall loss % (FTMO: `10`) |
| `MinTradingDays` | Number | ⚠️ Minimum trading days (FTMO: `10`) |

### Select Values

**Broker:** `FTMO` / `Interactive Brokers` / `TD Ameritrade` / `Fidelity` / `Other`

**Status:** `Active` / `Closed` / `Failed` / `Passed`

---

## 3. Instruments

**Env var:** `NOTION_DB_INSTRUMENTS`

| Property | Notion Type | Notes |
|---|---|---|
| `Name` | Title | Full name (e.g. "Nasdaq 100 CFD") |
| `Symbol` | Rich Text | Broker symbol (e.g. "US100", "XAUUSD") |
| `Type` | Select | `index` / `forex` / `commodity` / `stock` / `crypto` |
| `Leverage` | Number | Default leverage |
| `MarketOpen` | Rich Text | Opening time HH:MM (UTC) |
| `MarketClose` | Rich Text | Closing time HH:MM (UTC) |
| `Currency` | Select | Account currency (e.g. "USD") |
| `Active` | Checkbox | Currently in active use |
| `PipValue` | Number | Pip/tick value in account currency |
| `ContractSize` | Number | Contract size |
| `TickSize` | Number | Minimum price increment |
| `JournalId` | Relation | → Journals database |
| `ATR14` | Number | ⚠️ Current ATR(14) — update manually |
| `ATRUpdatedAt` | Date | ⚠️ When ATR was last updated |

### Ezio's Primary Instruments

| Symbol | Name | Type | Leverage |
|---|---|---|---|
| US100 | Nasdaq 100 | index | 10–20 |
| XAUUSD | Gold | commodity | 10–20 |

---

## 4. Rules (to be created)

**Env var:** `NOTION_DB_RULES`

| Property | Notion Type | Notes |
|---|---|---|
| `Name` | Title | Rule number and text (e.g. "1 — Max 3 trades per day") |
| `RuleNumber` | Number | Sort order |
| `RuleText` | Rich Text | Full rule text |
| `Reason` | Rich Text | Why this rule exists |
| `IsActive` | Checkbox | Default `true` |

### Default Rules (insert at setup)

| # | Text | Reason |
|---|---|---|
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

## 5. DailyRoutines (to be created)

**Env var:** `NOTION_DB_DAILY_ROUTINES`

| Property | Notion Type | Notes |
|---|---|---|
| `Name` | Title | Date in "YYYY-MM-DD" format |
| `Date` | Date | Day date |
| `MorningReviewDone` | Checkbox | Morning review completed |
| `MorningReviewTime` | Rich Text | Completion time HH:MM |
| `EveningJournalDone` | Checkbox | Evening journal completed |
| `ChecklistCompleted` | Number | Pre-trade checklist items completed today |
| `ChecklistTotal` | Number | Total checklist items (depends on setup) |
| `TradesCount` | Number | Trades executed today |
| `RuleViolations` | Number | Rule violations today |
| `DailyNote` | Rich Text | Daily note |
| `EmotionAvg` | Select | Prevalent emotion (same values as Sentiment) |

---

## 6. WeeklyReviews (to be created)

**Env var:** `NOTION_DB_WEEKLY_REVIEWS`

| Property | Notion Type | Notes |
|---|---|---|
| `Name` | Title | "Week YYYY-WW" (e.g. "Week 2026-09") |
| `WeekStart` | Date | Monday of the week |
| `WeekEnd` | Date | Friday of the week |
| `TotalTrades` | Number | |
| `WinRate` | Number | % |
| `TotalPnL` | Number | |
| `MistakePct` | Number | % of trades with mistakes |
| `BestTradeNote` | Rich Text | |
| `WorstTradeNote` | Rich Text | |
| `ChecklistCompliancePct` | Number | % of checklists completed |
| `ImprovementsNextWeek` | Rich Text | |
| `NextWeekGoal` | Rich Text | |

---

## Database Relationships

```
Journals (Accounts)
    ├── ← Instruments (JournalId)
    └── ← Trades (JournalId)

Instruments
    └── ← Trades (InstrumentId)
```

---

## Notion → TypeScript Mapping Notes

Notion properties have a verbose nested structure. Centralize all mapping in `server/notion/`:

```ts
// Helper functions for reading Notion property values
function getNumber(page: PageObjectResponse, property: string): number | null {
  const prop = page.properties[property];
  if (prop?.type === 'number') return prop.number;
  return null;
}

function getSelect(page: PageObjectResponse, property: string): string | null {
  const prop = page.properties[property];
  if (prop?.type === 'select') return prop.select?.name ?? null;
  return null;
}
```

---

## Reference CSVs

The CSVs in `notion_db/` are Notion database exports and serve as a schema reference. The data they contain is sample/test data.

| File | Notion Database |
|---|---|
| `Trades 3115e61f...csv` | Trades |
| `Journals 3115e61f...csv` | Journals (Accounts) |
| `Instruments 3115e61f...csv` | Instruments |
