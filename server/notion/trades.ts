import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { notion, DB } from './client'
import { num, select, statusProp, multiSelect, richText, titleText, dateStart, relation, toRichText } from './helpers'
import type { Trade, CreateTrade, UpdateTrade, CloseTradeRequest, PartialClose, SetupType, Timeframe, Emotion, Mistake, TradeStatus, TradeDirection } from '../../src/lib/schema'

// --- Mapper: Notion page → Trade ---

function mapPage(page: PageObjectResponse): Trade {
  const p = page.properties
  return {
    id: page.id,
    name: titleText(p),
    direction: (select(p, 'Direction') ?? 'Long') as TradeDirection,
    entryPrice: num(p, 'EntryPrice') ?? 0,
    exitPrice: num(p, 'ExitPrice'),
    sl: num(p, 'SL'),
    tp: num(p, 'TP'),
    size: num(p, 'Size') ?? 0,
    pnl: num(p, 'PnL'),
    riskPercent: num(p, 'RiskPercent'),
    riskAmount: num(p, 'RiskAmount'),
    rrRatio: num(p, 'RR_Ratio'),
    leverage: num(p, 'Leverage'),
    atr14: num(p, 'ATR14'),
    spread: num(p, 'Spread'),
    status: (statusProp(p, 'Status') ?? 'Open') as TradeStatus,
    setupType: select(p, 'Strategy') as SetupType | null,
    timeframe: (select(p, 'Timeframe') ?? '1h') as Timeframe,
    emotion: select(p, 'Sentiment') as Emotion | null,
    mistakes: multiSelect(p, 'Mistakes') as Mistake[],
    preTradeNote: richText(p, 'PreTradeNote'),
    lessonLearned: richText(p, 'LessonLearned'),
    notes: richText(p, 'Notes'),
    checklistScore: num(p, 'ChecklistScore'),
    tags: multiSelect(p, 'Tags'),
    openDate: dateStart(p, 'OpenDate'),
    closeDate: dateStart(p, 'CloseDate'),
    accountId: relation(p, 'JournalId'),
    instrumentId: relation(p, 'InstrumentId'),
    partialCloses: parsePartialCloses(richText(p, 'PartialCloses')),
  }
}

function parsePartialCloses(raw: string | null): PartialClose[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// --- Queries ---

export interface TradeFilters {
  accountId?: string
  instrument?: string
  from?: string
  to?: string
}

export async function listTrades(filters: TradeFilters = {}): Promise<Trade[]> {
  const conditions: object[] = []

  if (filters.accountId) {
    conditions.push({ property: 'JournalId', relation: { contains: filters.accountId } })
  }
  if (filters.from) {
    conditions.push({ property: 'OpenDate', date: { on_or_after: filters.from } })
  }
  if (filters.to) {
    conditions.push({ property: 'OpenDate', date: { on_or_before: filters.to } })
  }

  const response = await notion.databases.query({
    database_id: DB.TRADES,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter: conditions.length > 0 ? ({ and: conditions } as any) : undefined,
    sorts: [{ property: 'OpenDate', direction: 'descending' }],
  })

  return (response.results as PageObjectResponse[]).map(mapPage)
}

export async function getTrade(id: string): Promise<Trade> {
  const page = (await notion.pages.retrieve({ page_id: id })) as PageObjectResponse
  return mapPage(page)
}

export async function createTrade(data: CreateTrade): Promise<Trade> {
  const tradeName = `${data.instrumentId ?? 'Trade'}-${data.direction}-${data.openDate}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {
    Name: { title: toRichText(tradeName) },
    Direction: { select: { name: data.direction } },
    EntryPrice: { number: data.entryPrice },
    Size: { number: data.size },
    Status: { status: { name: data.status ?? 'Open' } },
    OpenDate: { date: { start: data.openDate } },
    RiskPercent: { number: data.riskPercent },
    RiskAmount: { number: data.riskAmount },
    PreTradeNote: { rich_text: toRichText(data.preTradeNote) },
    Strategy: { select: { name: data.setupType } },
    Timeframe: { select: { name: data.timeframe ?? '1h' } },
    JournalId: { relation: [{ id: data.accountId }] },
    InstrumentId: { relation: [{ id: data.instrumentId }] },
  }

  if (data.sl != null) properties['SL'] = { number: data.sl }
  if (data.tp != null) properties['TP'] = { number: data.tp }
  if (data.rrRatio != null) properties['RR_Ratio'] = { number: data.rrRatio }
  if (data.leverage != null) properties['Leverage'] = { number: data.leverage }
  if (data.atr14 != null) properties['ATR14'] = { number: data.atr14 }
  if (data.spread != null) properties['Spread'] = { number: data.spread }
  if (data.emotion) properties['Sentiment'] = { select: { name: data.emotion } }
  if (data.mistakes?.length)
    properties['Mistakes'] = { multi_select: data.mistakes.map((m) => ({ name: m })) }
  if (data.tags?.length)
    properties['Tags'] = { multi_select: data.tags.map((t) => ({ name: t })) }
  if (data.checklistScore != null) properties['ChecklistScore'] = { number: data.checklistScore }
  if (data.notes) properties['Notes'] = { rich_text: toRichText(data.notes) }

  const page = (await notion.pages.create({
    parent: { database_id: DB.TRADES },
    properties,
  })) as PageObjectResponse

  return mapPage(page)
}

export async function updateTrade(id: string, data: UpdateTrade): Promise<Trade> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {}

  if (data.exitPrice != null) properties['ExitPrice'] = { number: data.exitPrice }
  if (data.pnl != null) properties['PnL'] = { number: data.pnl }
  if (data.status) properties['Status'] = { status: { name: data.status } }
  if (data.closeDate) properties['CloseDate'] = { date: { start: data.closeDate } }
  if (data.lessonLearned != null)
    properties['LessonLearned'] = { rich_text: toRichText(data.lessonLearned) }
  if (data.mistakes)
    properties['Mistakes'] = { multi_select: data.mistakes.map((m) => ({ name: m })) }
  if (data.notes) properties['Notes'] = { rich_text: toRichText(data.notes) }

  const page = (await notion.pages.update({ page_id: id, properties })) as PageObjectResponse
  return mapPage(page)
}

export async function closeTrade(id: string, data: CloseTradeRequest): Promise<Trade> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {
    PartialCloses: { rich_text: toRichText(JSON.stringify(data.partialCloses)) },
  }

  if (data.isFinalClose) {
    properties['Status'] = { status: { name: 'Closed' } }
    properties['PnL'] = { number: data.pnl }
    properties['ExitPrice'] = { number: data.exitPrice }
    properties['CloseDate'] = { date: { start: new Date().toISOString() } }
  } else {
    properties['Status'] = { status: { name: 'Partial' } }
  }

  const page = (await notion.pages.update({ page_id: id, properties })) as PageObjectResponse
  return mapPage(page)
}
