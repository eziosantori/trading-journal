import { Client } from '@notionhq/client'

if (!process.env.NOTION_TOKEN) {
  console.warn('[notion] NOTION_TOKEN is not set — all API calls will fail')
}

export const notion = new Client({ auth: process.env.NOTION_TOKEN })

/** Notion database IDs from environment variables. */
export const DB = {
  TRADES: process.env.NOTION_DB_TRADES ?? '',
  JOURNALS: process.env.NOTION_DB_JOURNALS ?? '',
  INSTRUMENTS: process.env.NOTION_DB_INSTRUMENTS ?? '',
  RULES: process.env.NOTION_DB_RULES ?? '',
  DAILY_ROUTINES: process.env.NOTION_DB_DAILY_ROUTINES ?? '',
  WEEKLY_REVIEWS: process.env.NOTION_DB_WEEKLY_REVIEWS ?? '',
} as const
