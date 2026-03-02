import { describe, it, expect } from 'vitest'
import {
  num,
  select,
  multiSelect,
  richText,
  titleText,
  dateStart,
  relation,
  checkbox,
  toRichText,
} from './helpers'

// Build a minimal mock Notion properties object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function props(entries: Record<string, unknown>): any {
  return entries
}

describe('num', () => {
  it('returns the numeric value', () => {
    expect(num(props({ RiskPct: { type: 'number', number: 1.5 } }), 'RiskPct')).toBe(1.5)
  })

  it('returns null for a missing key', () => {
    expect(num(props({}), 'RiskPct')).toBeNull()
  })

  it('returns null for a wrong property type', () => {
    expect(num(props({ RiskPct: { type: 'select', select: { name: 'foo' } } }), 'RiskPct')).toBeNull()
  })
})

describe('select', () => {
  it('returns the selected option name', () => {
    expect(select(props({ Status: { type: 'select', select: { name: 'Open' } } }), 'Status')).toBe('Open')
  })

  it('returns null when no option is selected', () => {
    expect(select(props({ Status: { type: 'select', select: null } }), 'Status')).toBeNull()
  })

  it('returns null for a missing key', () => {
    expect(select(props({}), 'Status')).toBeNull()
  })
})

describe('multiSelect', () => {
  it('returns an array of selected names', () => {
    const p = props({
      Mistakes: {
        type: 'multi_select',
        multi_select: [{ name: 'FOMO' }, { name: 'Overtrading' }],
      },
    })
    expect(multiSelect(p, 'Mistakes')).toEqual(['FOMO', 'Overtrading'])
  })

  it('returns an empty array when nothing is selected', () => {
    const p = props({ Mistakes: { type: 'multi_select', multi_select: [] } })
    expect(multiSelect(p, 'Mistakes')).toEqual([])
  })

  it('returns an empty array for a missing key', () => {
    expect(multiSelect(props({}), 'Mistakes')).toEqual([])
  })
})

describe('richText', () => {
  it('concatenates multiple text segments', () => {
    const p = props({
      Note: {
        type: 'rich_text',
        rich_text: [{ plain_text: 'Pre-trade: ' }, { plain_text: 'setup looks clean' }],
      },
    })
    expect(richText(p, 'Note')).toBe('Pre-trade: setup looks clean')
  })

  it('returns null when the rich text is empty', () => {
    const p = props({ Note: { type: 'rich_text', rich_text: [] } })
    expect(richText(p, 'Note')).toBeNull()
  })

  it('returns null for a missing key', () => {
    expect(richText(props({}), 'Note')).toBeNull()
  })
})

describe('titleText', () => {
  it('returns the page title', () => {
    const p = props({ Name: { type: 'title', title: [{ plain_text: 'US100 Long #1' }] } })
    expect(titleText(p)).toBe('US100 Long #1')
  })

  it('returns an empty string when no title property exists', () => {
    expect(titleText(props({}))).toBe('')
  })
})

describe('dateStart', () => {
  it('returns the start date string', () => {
    const p = props({ OpenDate: { type: 'date', date: { start: '2026-03-01' } } })
    expect(dateStart(p, 'OpenDate')).toBe('2026-03-01')
  })

  it('returns null when the date property is null', () => {
    const p = props({ OpenDate: { type: 'date', date: null } })
    expect(dateStart(p, 'OpenDate')).toBeNull()
  })

  it('returns null for a missing key', () => {
    expect(dateStart(props({}), 'OpenDate')).toBeNull()
  })
})

describe('relation', () => {
  it('returns the ID of the first related page', () => {
    const p = props({ Account: { type: 'relation', relation: [{ id: 'page-abc' }] } })
    expect(relation(p, 'Account')).toBe('page-abc')
  })

  it('returns null when the relation is empty', () => {
    const p = props({ Account: { type: 'relation', relation: [] } })
    expect(relation(p, 'Account')).toBeNull()
  })

  it('returns null for a missing key', () => {
    expect(relation(props({}), 'Account')).toBeNull()
  })
})

describe('checkbox', () => {
  it('returns true when checked', () => {
    const p = props({ Active: { type: 'checkbox', checkbox: true } })
    expect(checkbox(p, 'Active')).toBe(true)
  })

  it('returns false when unchecked', () => {
    const p = props({ Active: { type: 'checkbox', checkbox: false } })
    expect(checkbox(p, 'Active')).toBe(false)
  })

  it('returns false for a missing key', () => {
    expect(checkbox(props({}), 'Active')).toBe(false)
  })
})

describe('toRichText', () => {
  it('wraps a string into the Notion rich text format', () => {
    expect(toRichText('My note')).toEqual([{ text: { content: 'My note' } }])
  })

  it('handles an empty string', () => {
    expect(toRichText('')).toEqual([{ text: { content: '' } }])
  })
})
