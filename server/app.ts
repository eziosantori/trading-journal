import { Hono } from 'hono'
import { logger } from 'hono/logger'
import trades from './routes/trades'
import accounts from './routes/accounts'
import instruments from './routes/instruments'
import rules from './routes/rules'
import stats from './routes/stats'

const app = new Hono().basePath('/api')

app.use('*', logger())

app.route('/trades', trades)
app.route('/accounts', accounts)
app.route('/instruments', instruments)
app.route('/rules', rules)
app.route('/stats', stats)

app.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }))

app.onError((err, c) => {
  console.error('[server error]', err)
  return c.json({ error: err.message }, 500)
})

export default app
