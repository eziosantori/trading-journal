import { Hono } from 'hono'
import { listInstruments, getInstrument } from '../notion/instruments'

const instruments = new Hono()

instruments.get('/', async (c) => {
  const activeOnly = c.req.query('activeOnly') !== 'false'
  const data = await listInstruments(activeOnly)
  return c.json(data)
})

instruments.get('/:id', async (c) => {
  const instrument = await getInstrument(c.req.param('id'))
  return c.json(instrument)
})

export default instruments
