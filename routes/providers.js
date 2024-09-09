import database from '../lib/database.js'
import express from 'express'
const router = express.Router()

router.put('/', async (req, res, next) => {
  // console.log(req.headers)
  // console.log(req.body)

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
  console.log(req.headers)
  console.log(req.params)

  const Providers = await database.getProviders(req.params.cid)

  const resBody = {Providers}
  res.send(resBody)
})

/*
{
  "Providers": [
    {
      "Addrs": [
        "/ip4/0.0.0.0/tcp/4001",
        "/ip6/::/tcp/4001",
        "/ip4/0.0.0.0/udp/4001/quic-v1",
        "/ip4/0.0.0.0/udp/4001/quic-v1/webtransport",
        "/ip6/::/udp/4001/quic-v1",
        "/ip6/::/udp/4001/quic-v1/webtransport"
      ],
      "ID": "12D3KooWEdCRaQTjjgbtBoSMhnguznp7GHhsin8eRDEtgEso6Z1B",
      "Protocols": [
        "transport-bitswap"
      ],
      "Schema": "peer",
      "transport-bitswap": "gBI="
    }
  ]
}
*/

export default router
