import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { notion, DB } from './client'
import { num, select, richText, titleText, dateStart, checkbox } from './helpers'
import type { Instrument } from '../../src/lib/schema'

function mapPage(page: PageObjectResponse): Instrument {
  const p = page.properties
  return {
    id: page.id,
    name: titleText(p),
    symbol: richText(p, 'Symbol') ?? '',
    type: (select(p, 'Type') ?? 'index') as Instrument['type'],
    leverage: num(p, 'Leverage') ?? 1,
    marketOpen: richText(p, 'MarketOpen'),
    marketClose: richText(p, 'MarketClose'),
    currency: select(p, 'Currency'),
    active: checkbox(p, 'Active'),
    pipValue: num(p, 'PipValue') ?? 1,
    contractSize: num(p, 'ContractSize') ?? 1,
    tickSize: num(p, 'TickSize') ?? 0.01,
    atr14: num(p, 'ATR14'),
    atrUpdatedAt: dateStart(p, 'ATRUpdatedAt'),
  }
}

export async function listInstruments(activeOnly = true): Promise<Instrument[]> {
  const response = await notion.databases.query({
    database_id: DB.INSTRUMENTS,
    filter: activeOnly ? { property: 'Active', checkbox: { equals: true } } : undefined,
    sorts: [{ property: 'Name', direction: 'ascending' }],
  })
  return (response.results as PageObjectResponse[]).map(mapPage)
}

export async function getInstrument(id: string): Promise<Instrument> {
  const page = (await notion.pages.retrieve({ page_id: id })) as PageObjectResponse
  return mapPage(page)
}
