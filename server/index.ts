import 'dotenv/config'
import { serve } from '@hono/node-server'
import app from './app'

const PORT = Number(process.env.PORT ?? 3001)

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[server] running at http://localhost:${PORT}`)
  console.log(`[server] health check: http://localhost:${PORT}/api/health`)

  if (!process.env.NOTION_TOKEN) {
    console.warn('[server] ⚠️  NOTION_TOKEN not set — copy .env.example to .env and fill in values')
  }
})
