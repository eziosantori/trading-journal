import { Hono } from 'hono'
import { listAccounts, getAccount } from '../notion/accounts'

const accounts = new Hono()

accounts.get('/', async (c) => {
  const data = await listAccounts()
  return c.json(data)
})

accounts.get('/:id', async (c) => {
  const account = await getAccount(c.req.param('id'))
  return c.json(account)
})

export default accounts
