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

  res.set('Content-Type', 'application/json')
  res.send(resBody)
})

router.get('/:cid', async (req, res, next) => {
  const {providers, lastModified} = await database.getProviders(req.params.cid)

  const resBody = {Providers: providers}

  // cache-control
  // if server is down, serve cached providers for 24h
  const staleIfError = 60 * 60 * 24
  // 1 minute if has results
  let maxAge = 60
  // 10 seconds if no results
  if (!providers.length) {
    maxAge = 10
    res.status(404)
  }
  res.set('Cache-Control', `public, max-age=${maxAge}, public, stale-if-error=${staleIfError}`)

  // TODO: add support for application/x-ndjson (streaming)
  res.set('Content-Type', 'application/json')
  res.set('Vary', 'Accept')
  if (lastModified) {
    res.set('Last-Modified', new Date(lastModified).toUTCString())
  }
  res.send(resBody)
})

export default router
