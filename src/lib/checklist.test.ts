import { describe, it, expect } from 'vitest'
import { getChecklist, GENERIC_RULES, SETUP_RULES } from './checklist'
import type { SetupType } from './schema'

const ALL_SETUPS: SetupType[] = [
  'Trend Following',
  'Pullback to S/R',
  'Breakout',
  'Range Trading',
  'Mean Reversion',
]

describe('getChecklist', () => {
  it('includes non-conditional generic rules + setup-specific rules', () => {
    const genericCount = GENERIC_RULES.filter((r) => !r.conditional).length
    const setupCount = SETUP_RULES['Trend Following'].length
    const list = getChecklist('Trend Following')
    expect(list).toHaveLength(genericCount + setupCount)
  })

  it('excludes the conditional office-day rule (G12) by default', () => {
    const list = getChecklist('Breakout')
    expect(list.find((r) => r.id === 'G12')).toBeUndefined()
  })

  it('includes G12 when isOfficeDay is true', () => {
    const list = getChecklist('Breakout', true)
    expect(list.find((r) => r.id === 'G12')).toBeDefined()
  })

  it('total count increases by 1 on office days', () => {
    const normal = getChecklist('Breakout', false).length
    const office = getChecklist('Breakout', true).length
    expect(office).toBe(normal + 1)
  })

  it('returns the correct setup-specific rules for every setup type', () => {
    for (const setup of ALL_SETUPS) {
      const list = getChecklist(setup)
      for (const rule of SETUP_RULES[setup]) {
        expect(list.find((r) => r.id === rule.id)).toBeDefined()
      }
    }
  })

  it('does not leak rules from other setups', () => {
    const trendList = getChecklist('Trend Following')
    const breakoutIds = new Set(SETUP_RULES['Breakout'].map((r) => r.id))
    const leaked = trendList.filter((r) => breakoutIds.has(r.id))
    expect(leaked).toHaveLength(0)
  })

  it('all returned items have an id and text', () => {
    const list = getChecklist('Mean Reversion', true)
    for (const item of list) {
      expect(item.id).toBeTruthy()
      expect(item.text).toBeTruthy()
    }
  })
})
