import database from '../lib/database.js'
import {cleanAddrs} from '../lib/utils.js'
import express from 'express'
const router = express.Router()
import Debug from 'debug'
const debug = Debug('ipfs-tracker:routes:providers')
import prometheus from '../lib/prometheus.js'

router.put('/', async (req, res, next) => {
  prometheus.postProviders()

  // TODO: don't let people add ip addresses that aren't theirs, or peers without any Addrs, or private ips Addrs
  /* TODO: once the POST spec is finalized, add interval and min interval to response, and remove peers after this time
    The Pirate Bay: Often uses an announce interval of 1800 seconds (30 minutes).
    1337x: May use similar intervals like 1800 seconds, with a minimum announce interval of around 300 seconds.
    Rutracker: Frequently employs announce intervals of 1800 seconds, and minimum intervals of around 300-600 seconds.
  */

  // validate ip before adding to db
  const providers = []
  for (const provider of req.body.Providers) {
    provider.Payload.Addrs = cleanAddrs(provider.Payload.Addrs, req.ip)
    if (provider.Payload.Addrs.length) {
      providers.push(provider)
    }
  }

  prometheus.postProvidersProviders(providers)

  if (!providers.length) {
    debug('no providers with valid addresses')
  }

  await database.addProviders(providers)

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
  prometheus.postProvidersSuccess()
})

router.get('/:cid', async (req, res, next) => {
  prometheus.getProviders()

  const {providers, lastModified} = await database.getProviders(req.params.cid)

  prometheus.getProvidersProviders(providers)

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
  prometheus.getProvidersSuccess()
})

export default router
