/**
 * Pre-trade checklist rules — hardcoded in v1.
 * See docs/CHECKLIST-RULES.md for full documentation.
 *
 * To extend: add items to GENERIC_RULES or SETUP_RULES.
 * The UI renders whatever getChecklist() returns — no other changes needed.
 */
import type { SetupType } from './schema'

export interface ChecklistItem {
  id: string
  text: string
  /** If true, only shown when the user marks today as an office day */
  conditional?: boolean
}

export const GENERIC_RULES: ChecklistItem[] = [
  { id: 'G1', text: 'I have identified market structure on HTF (4h/Daily)' },
  { id: 'G2', text: 'The operational timeframe (1h) is aligned with the HTF' },
  { id: 'G3', text: 'I have written the pre-trade note (required field)' },
  { id: 'G4', text: 'I have identified key levels (S/R, liquidity zones)' },
  { id: 'G5', text: 'ATR(14) is current (updated this week)' },
  { id: 'G6', text: 'Stop Loss defined: min 1.5× ATR from entry' },
  { id: 'G7', text: 'Take Profit defined: R:R ≥ 2' },
  { id: 'G8', text: 'Position size calculated: risk ≤ 2% of account balance' },
  { id: 'G9', text: 'Fewer than 3 trades executed today' },
  { id: 'G10', text: 'Fewer than 2 consecutive losses today' },
  { id: 'G11', text: 'At least 2h have passed since the last trade' },
  {
    id: 'G12',
    text: 'If today is an office day: this is the first trade of the day',
    conditional: true,
  },
]

export const SETUP_RULES: Record<SetupType, ChecklistItem[]> = {
  'Trend Following': [
    {
      id: 'TF1',
      text: 'Trend confirmed by higher highs + higher lows (long) or lower highs + lower lows (short)',
    },
    { id: 'TF2', text: 'Price is above/below EMA20 or EMA50 on the 1h timeframe' },
    { id: 'TF3', text: 'Not entering against a major HTF resistance/support level' },
    { id: 'TF4', text: 'Entry is on a small consolidation or minor pullback, not chasing price' },
  ],
  'Pullback to S/R': [
    { id: 'PR1', text: 'A prior trend is clearly established' },
    {
      id: 'PR2',
      text: 'Price has retraced to a key level (ex-resistance become support, or vice versa)',
    },
    { id: 'PR3', text: 'Confirmation candle at the level (rejection wick, engulfing, inside bar)' },
    { id: 'PR4', text: 'Volume shows acceptance at the level (not rejection)' },
  ],
  Breakout: [
    {
      id: 'BO1',
      text: 'The key level to break is clearly defined (horizontal range or compression zone)',
    },
    { id: 'BO2', text: 'Breakout candle has above-average volume' },
    { id: 'BO3', text: 'No major resistance/support immediately above/below the target' },
    { id: 'BO4', text: 'Market is not in a thin session (check instrument market hours)' },
  ],
  'Range Trading': [
    { id: 'RT1', text: 'Range is clearly defined with at least 2 touches on each side' },
    { id: 'RT2', text: 'Relative ATR is low (price is not trending strongly)' },
    { id: 'RT3', text: 'Entering AT the range extreme, not in the middle' },
    { id: 'RT4', text: 'Opposite boundary is at least 2× the risk distance away (adequate R:R)' },
  ],
  'Mean Reversion': [
    { id: 'MR1', text: 'Price is at extreme deviation from the mean (≥ 2 ATR from EMA20 on 1h)' },
    { id: 'MR2', text: 'RSI is in oversold (<30) or overbought (>70) zone on 1h' },
    { id: 'MR3', text: 'No fundamental catalyst justifying the move (no major news)' },
    { id: 'MR4', text: 'Entry is AFTER the first reversal signal, not in anticipation of one' },
  ],
}

/**
 * Returns the full checklist for a given setup type.
 * @param setupType - The selected trade setup
 * @param isOfficeDay - If true, the conditional office-day rule (G12) is included
 */
export function getChecklist(setupType: SetupType, isOfficeDay = false): ChecklistItem[] {
  const generic = isOfficeDay
    ? GENERIC_RULES
    : GENERIC_RULES.filter((r) => !r.conditional)
  return [...generic, ...SETUP_RULES[setupType]]
}
