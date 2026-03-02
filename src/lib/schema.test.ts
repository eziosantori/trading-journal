import { describe, it, expect } from 'vitest'
import { CreateTradeSchema, UpdateTradeSchema } from './schema'

const BASE: Parameters<typeof CreateTradeSchema.safeParse>[0] = {
  direction: 'Long',
  entryPrice: 20_000,
  sl: 19_800,
  size: 0.5,
  riskPercent: 1,
  riskAmount: 1000,
  setupType: 'Breakout',
  preTradeNote: 'Clean breakout above resistance on 1h with volume confirmation',
  openDate: '2026-03-01',
  accountId: 'acc-123',
  instrumentId: 'inst-456',
}

describe('CreateTradeSchema', () => {
  it('accepts a valid trade payload', () => {
    expect(CreateTradeSchema.safeParse(BASE).success).toBe(true)
  })

  it('rejects an empty preTradeNote (mandatory business rule)', () => {
    const result = CreateTradeSchema.safeParse({ ...BASE, preTradeNote: '' })
    expect(result.success).toBe(false)
  })

  it('rejects riskPercent above 10', () => {
    const result = CreateTradeSchema.safeParse({ ...BASE, riskPercent: 10.1 })
    expect(result.success).toBe(false)
  })

  it('accepts riskPercent exactly at 10', () => {
    const result = CreateTradeSchema.safeParse({ ...BASE, riskPercent: 10 })
    expect(result.success).toBe(true)
  })

  it('rejects non-positive entryPrice', () => {
    expect(CreateTradeSchema.safeParse({ ...BASE, entryPrice: 0 }).success).toBe(false)
    expect(CreateTradeSchema.safeParse({ ...BASE, entryPrice: -1 }).success).toBe(false)
  })

  it('rejects non-positive sl', () => {
    expect(CreateTradeSchema.safeParse({ ...BASE, sl: 0 }).success).toBe(false)
    expect(CreateTradeSchema.safeParse({ ...BASE, sl: -100 }).success).toBe(false)
  })

  it('rejects non-positive size', () => {
    expect(CreateTradeSchema.safeParse({ ...BASE, size: 0 }).success).toBe(false)
  })

  it('defaults status to Open', () => {
    const result = CreateTradeSchema.safeParse(BASE)
    expect(result.success && result.data.status).toBe('Open')
  })

  it('defaults mistakes to empty array', () => {
    const result = CreateTradeSchema.safeParse(BASE)
    expect(result.success && result.data.mistakes).toEqual([])
  })

  it('defaults tags to empty array', () => {
    const result = CreateTradeSchema.safeParse(BASE)
    expect(result.success && result.data.tags).toEqual([])
  })
})

describe('UpdateTradeSchema', () => {
  it('accepts an empty object (all fields are optional)', () => {
    expect(UpdateTradeSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a partial update with exitPrice and pnl', () => {
    expect(UpdateTradeSchema.safeParse({ exitPrice: 20_200, pnl: 500 }).success).toBe(true)
  })

  it('accepts a status-only update', () => {
    expect(UpdateTradeSchema.safeParse({ status: 'Closed' }).success).toBe(true)
  })
})
