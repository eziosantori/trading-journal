import { Hono } from 'hono'
import { notion, DB } from '../notion/client'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { num, richText, titleText, checkbox } from '../notion/helpers'

const rules = new Hono()

rules.get('/', async (c) => {
  const response = await notion.databases.query({
    database_id: DB.RULES,
    filter: { property: 'IsActive', checkbox: { equals: true } },
    sorts: [{ property: 'RuleNumber', direction: 'ascending' }],
  })

  const data = (response.results as PageObjectResponse[]).map((page) => ({
    id: page.id,
    name: titleText(page.properties),
    ruleNumber: num(page.properties, 'RuleNumber'),
    ruleText: richText(page.properties, 'RuleText'),
    reason: richText(page.properties, 'Reason'),
    isActive: checkbox(page.properties, 'IsActive'),
  }))

  return c.json(data)
})

export default rules
