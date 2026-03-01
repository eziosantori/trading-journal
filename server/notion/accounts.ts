import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { notion, DB } from './client'
import { num, select, richText, titleText, dateStart } from './helpers'
import type { Account } from '../../src/lib/schema'

function mapPage(page: PageObjectResponse): Account {
  const p = page.properties
  return {
    id: page.id,
    name: titleText(p),
    broker: select(p, 'Broker'),
    balance: num(p, 'Balance') ?? 0,
    startBalance: num(p, 'StartBalance'),
    currency: select(p, 'Currency') ?? 'USD',
    status: (select(p, 'Status') ?? 'Active') as Account['status'],
    category: select(p, 'Category'),
    challengeType: select(p, 'ChallengeType'),
    profitTargetPct: num(p, 'ProfitTargetPct'),
    maxDailyLossPct: num(p, 'MaxDailyLossPct'),
    maxOverallLossPct: num(p, 'MaxOverallLossPct'),
    minTradingDays: num(p, 'MinTradingDays'),
    description: richText(p, 'Description'),
    date: dateStart(p, 'Date'),
  }
}

export async function listAccounts(): Promise<Account[]> {
  const response = await notion.databases.query({
    database_id: DB.JOURNALS,
    sorts: [{ property: 'Date', direction: 'descending' }],
  })
  return (response.results as PageObjectResponse[]).map(mapPage)
}

export async function getAccount(id: string): Promise<Account> {
  const page = (await notion.pages.retrieve({ page_id: id })) as PageObjectResponse
  return mapPage(page)
}
