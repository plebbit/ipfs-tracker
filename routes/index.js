import express from 'express'
const router = express.Router()

router.get('/', (req, res, next) => {
  res.send('Welcome to an IPFS tracker.')
})

export default router
