import express from 'express'
const router = express.Router()

router.put('/', (req, res, next) => {
  const json = {
    ProvideResults: [
      {
        Schema: 'bitswap',
        Protocol: 'transport-bitswap',
        AdvisoryTTL: 86400000000000
      }
    ]
  }
  res.send(json)
})

export default router
