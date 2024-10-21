import express from 'express'
const router = express.Router()
import prometheus from '../lib/prometheus.js'

router.get('/', async (req, res) => {
  const metricsResponse = await prometheus.promClient.register.metrics()
  res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'})
  res.write(metricsResponse)    
})

export default router
