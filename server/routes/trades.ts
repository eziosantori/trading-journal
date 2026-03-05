import { Hono } from 'hono'
import { listTrades, getTrade, createTrade, updateTrade, closeTrade } from '../notion/trades'
import type { UpdateTrade, CloseTradeRequest } from '../../src/lib/schema'

const trades = new Hono()

trades.get('/', async (c) => {
  const { accountId, instrument, from, to } = c.req.query()
  const data = await listTrades({ accountId, instrument, from, to })
  return c.json(data)
})

trades.get('/:id', async (c) => {
  const trade = await getTrade(c.req.param('id'))
  return c.json(trade)
})

trades.post('/', async (c) => {
  const body = await c.req.json()
  const trade = await createTrade(body)
  return c.json(trade, 201)
})

trades.patch('/:id', async (c) => {
  const body = await c.req.json() as UpdateTrade
  const trade = await updateTrade(c.req.param('id'), body)
  return c.json(trade)
})

trades.post('/:id/close', async (c) => {
  const body = await c.req.json() as CloseTradeRequest
  const trade = await closeTrade(c.req.param('id'), body)
  return c.json(trade)
})

export default trades
