# Pre-Trade Checklist Rules

Every trade must pass two levels of checklist before it can be submitted:
1. **Generic rules** — apply to every trade, regardless of setup
2. **Setup-specific rules** — depend on the selected `SetupType`

The Log Trade wizard (step 5) shows both levels. Form submission is blocked until all items are checked.

---

## Generic Rules (all trades)

These items always appear, regardless of the chosen setup.

| # | Item | What it verifies |
|---|---|---|
| G1 | I have identified market structure on HTF (4h/Daily) | Clear macro trend before entry |
| G2 | The operational timeframe (1h) is aligned with the HTF | No trades against the major trend |
| G3 | I have written the pre-trade note (required field) | Awareness and intentionality |
| G4 | I have identified key levels (S/R, liquidity zones) | Setup has a technical context |
| G5 | ATR(14) is current (updated this week) | Correct technical SL calculation |
| G6 | Stop Loss defined: min 1.5× ATR from entry | Technical SL, not arbitrary |
| G7 | Take Profit defined: R:R ≥ 2 | Risk/reward asymmetry |
| G8 | Position size calculated: risk ≤ 2% of account balance | Capital protection |
| G9 | Fewer than 3 trades executed today | Anti-overtrading rule |
| G10 | Fewer than 2 consecutive losses today | Anti-revenge trading rule |
| G11 | At least 2h have passed since the last trade | Post-trade cooldown |
| G12 | If today is an office day: this is the first trade of the day | Work compatibility |

**Total generic items: 12**

> G12 is conditional: it appears only if today is marked as an office day (configurable in Settings per weekday).

---

## Setup-Specific Rules

### Trend Following

Additional items when `Strategy = "Trend Following"`:

| # | Item |
|---|---|
| TF1 | Trend confirmed by higher highs + higher lows (long) or lower highs + lower lows (short) |
| TF2 | Price is above/below EMA20 or EMA50 on the 1h timeframe |
| TF3 | Not entering against a major HTF resistance/support level |
| TF4 | Entry is on a small consolidation or minor pullback, not chasing price |

**Setup total: 12 generic + 4 = 16 items**

---

### Pullback to S/R

Additional items when `Strategy = "Pullback to S/R"`:

| # | Item |
|---|---|
| PR1 | A prior trend is clearly established |
| PR2 | Price has retraced to a key level (ex-resistance become support, or vice versa) |
| PR3 | Confirmation candle at the level (rejection wick, engulfing, inside bar) |
| PR4 | Volume shows acceptance at the level (not rejection) |

**Setup total: 12 generic + 4 = 16 items**

---

### Breakout

Additional items when `Strategy = "Breakout"`:

| # | Item |
|---|---|
| BO1 | The key level to break is clearly defined (horizontal range or compression zone) |
| BO2 | Breakout candle has above-average volume |
| BO3 | No major resistance/support immediately above/below the target |
| BO4 | Market is not in a thin session (check instrument market hours) |

**Setup total: 12 generic + 4 = 16 items**

---

### Range Trading

Additional items when `Strategy = "Range Trading"`:

| # | Item |
|---|---|
| RT1 | Range is clearly defined with at least 2 touches on each side |
| RT2 | Relative ATR is low (price is not trending strongly) |
| RT3 | Entering AT the range extreme, not in the middle |
| RT4 | Opposite boundary is at least 2× the risk distance away (adequate R:R) |

**Setup total: 12 generic + 4 = 16 items**

---

### Mean Reversion

Additional items when `Strategy = "Mean Reversion"`:

| # | Item |
|---|---|
| MR1 | Price is at extreme deviation from the mean (≥ 2 ATR from EMA20 on 1h) |
| MR2 | RSI is in oversold (<30) or overbought (>70) zone on 1h |
| MR3 | No fundamental catalyst justifying the move (no major news) |
| MR4 | Entry is AFTER the first reversal signal, not in anticipation of one |

**Setup total: 12 generic + 4 = 16 items**

---

## Implementation (v1 — Hardcoded)

In v1 the setups and their rules are **hardcoded** in the frontend. They are not user-configurable.

```ts
// src/lib/checklist.ts

export const GENERIC_RULES: ChecklistItem[] = [
  { id: 'G1', text: 'I have identified market structure on HTF (4h/Daily)' },
  { id: 'G2', text: 'The operational timeframe (1h) is aligned with the HTF' },
  // ... G3–G12
];

export const SETUP_RULES: Record<SetupType, ChecklistItem[]> = {
  'Trend Following': [
    { id: 'TF1', text: 'Trend confirmed by HH+HL (long) or LH+LL (short)' },
    // ...
  ],
  'Pullback to S/R': [ /* ... */ ],
  'Breakout': [ /* ... */ ],
  'Range Trading': [ /* ... */ ],
  'Mean Reversion': [ /* ... */ ],
};

export function getChecklist(setupType: SetupType): ChecklistItem[] {
  return [...GENERIC_RULES, ...SETUP_RULES[setupType]];
}
```

The wizard component (step 5) calls `getChecklist(setupType)` and renders all items. The `ChecklistScore` saved to Notion is the count of checked items at submission time.

---

## Future Evolution (post v1)

- Make generic rules user-configurable (Notion Rules database + Settings UI)
- Allow creating/editing setups and their rules from the UI (Settings → Checklist)
- Add conditional items based on time of day, weekday, or instrument
