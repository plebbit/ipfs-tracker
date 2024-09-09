import database from '../lib/database.js'
import express from 'express'
const router = express.Router()

router.put('/', async (req, res, next) => {
  await database.addProviders(req.body.Providers)

  const resBody = {ProvideResults: []}
  for (const Provider of req.body.Providers) {
    resBody.ProvideResults.push({
      Schema: Provider.Schema,
      Protocol: Provider.Protocol,
      AdvisoryTTL: Provider.Payload.AdvisoryTTL
    })
  }
  res.send(resBody)
})

router.get('/:cid', async (req, res, next) => {
  const Providers = await database.getProviders(req.params.cid)

  const resBody = {Providers}
  res.send(resBody)
})

export default router
