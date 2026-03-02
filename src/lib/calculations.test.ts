import { describe, it, expect } from 'vitest'
import {
  riskAmount,
  riskPercent,
  positionSize,
  rrRatio,
  atrStopLoss,
  tradePnL,
  isRiskWithinLimit,
} from './calculations'

describe('riskAmount', () => {
  it('calculates dollar risk from balance and percentage', () => {
    expect(riskAmount(100_000, 1)).toBe(1000)
    expect(riskAmount(200_000, 0.5)).toBe(1000)
    expect(riskAmount(193_564, 2)).toBeCloseTo(3871.28)
  })

  it('returns 0 when balance is 0', () => {
    expect(riskAmount(0, 2)).toBe(0)
  })
})

describe('riskPercent', () => {
  it('calculates percentage from balance and dollar risk', () => {
    expect(riskPercent(100_000, 1000)).toBe(1)
    expect(riskPercent(50_000, 500)).toBe(1)
  })

  it('returns 0 when balance is 0 (guard against division by zero)', () => {
    expect(riskPercent(0, 1000)).toBe(0)
  })
})

describe('positionSize', () => {
  it('calculates size correctly', () => {
    // $100k, 1% risk = $1000. SL distance = 100pts, pip value = $1/lot → 10 lots
    expect(positionSize(100_000, 1, 20_000, 19_900, 1)).toBe(10)
  })

  it('scales with balance', () => {
    // $200k, same params → 20 lots
    expect(positionSize(200_000, 1, 20_000, 19_900, 1)).toBe(20)
  })

  it('returns 0 when SL distance is 0 (entry equals SL)', () => {
    expect(positionSize(100_000, 1, 20_000, 20_000, 1)).toBe(0)
  })

  it('returns 0 when pip value is 0', () => {
    expect(positionSize(100_000, 1, 20_000, 19_900, 0)).toBe(0)
  })
})

describe('rrRatio', () => {
  it('calculates R:R for a Long trade', () => {
    // Entry 100, SL 98 (risk 2), TP 106 (reward 6) → 3R
    expect(rrRatio(100, 98, 106)).toBe(3)
  })

  it('calculates R:R for a Short trade', () => {
    // Entry 100, SL 102 (risk 2), TP 94 (reward 6) → 3R
    expect(rrRatio(100, 102, 94)).toBe(3)
  })

  it('returns 0 when SL distance is 0', () => {
    expect(rrRatio(100, 100, 110)).toBe(0)
  })

  it('calculates minimum acceptable R:R (2R)', () => {
    // Entry 100, SL 99 (risk 1), TP 102 (reward 2) → 2R
    expect(rrRatio(100, 99, 102)).toBe(2)
  })
})

describe('atrStopLoss', () => {
  it('places SL below entry for Long trades (1.5× ATR default)', () => {
    // Entry 20000, ATR 100 × 1.5 = 150 → SL 19850
    expect(atrStopLoss(20_000, 'Long', 100)).toBe(19_850)
  })

  it('places SL above entry for Short trades (1.5× ATR default)', () => {
    expect(atrStopLoss(20_000, 'Short', 100)).toBe(20_150)
  })

  it('respects a custom multiplier', () => {
    // 2× ATR
    expect(atrStopLoss(20_000, 'Long', 100, 2)).toBe(19_800)
    expect(atrStopLoss(20_000, 'Short', 100, 2)).toBe(20_200)
  })
})

describe('tradePnL', () => {
  it('returns positive P&L for a profitable Long', () => {
    // (110 - 100) * 2 lots * $10/lot = $200
    expect(tradePnL('Long', 100, 110, 2, 10)).toBe(200)
  })

  it('returns negative P&L for a losing Long', () => {
    expect(tradePnL('Long', 100, 90, 2, 10)).toBe(-200)
  })

  it('returns positive P&L for a profitable Short', () => {
    // (100 - 90) * 2 lots * $10/lot = $200
    expect(tradePnL('Short', 100, 90, 2, 10)).toBe(200)
  })

  it('returns negative P&L for a losing Short', () => {
    expect(tradePnL('Short', 100, 110, 2, 10)).toBe(-200)
  })
})

describe('isRiskWithinLimit', () => {
  it('returns true when risk is at or below the 2% default', () => {
    expect(isRiskWithinLimit(1)).toBe(true)
    expect(isRiskWithinLimit(2)).toBe(true)
  })

  it('returns false when risk exceeds the 2% default', () => {
    expect(isRiskWithinLimit(2.01)).toBe(false)
  })

  it('respects a custom limit', () => {
    expect(isRiskWithinLimit(1, 1)).toBe(true)
    expect(isRiskWithinLimit(1.01, 1)).toBe(false)
  })
})
